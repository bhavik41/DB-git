const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../configs/db');

const JWT_SECRET = process.env.JWT_SECRET || 'bhavik-db-git-security-token-2024';

// ─────────────────────────────────────────────
// Helper: Fetch GitHub profile + primary email
// ─────────────────────────────────────────────
async function getGitHubProfile(github_token) {
    const [userResponse, emailResponse] = await Promise.all([
        axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${github_token}` }
        }),
        axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${github_token}` }
        })
    ]);

    const primaryEmail =
        emailResponse.data.find(e => e.primary && e.verified)?.email ||
        emailResponse.data[0]?.email ||
        null;

    const { login, id } = userResponse.data;

    if (!login || !id) {
        throw new Error('GitHub profile is missing required fields (login or id).');
    }

    return { login, githubId: id.toString(), primaryEmail };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Safe upsert — NEVER passes `id` to create, handles all edge cases
// This is the single source of truth for user creation/update in the entire app
// ─────────────────────────────────────────────────────────────────────────────
async function safeUpsertUser({ githubId, login, primaryEmail }) {
    // Validate inputs before touching DB
    if (!githubId) throw new Error('githubId is required to upsert user.');
    if (!login)    throw new Error('GitHub login (username) is required.');

    // Build OR conditions — only include email if we have one
    const orConditions = [{ githubId }];
    if (primaryEmail) orConditions.push({ email: primaryEmail });

    // Find existing user by githubId OR email
    let user = await prisma.user.findFirst({
        where: { OR: orConditions }
    });

    if (user) {
        // Update — only update fields that are provided
        user = await prisma.user.update({
            where: { id: user.id },  // always use numeric id for the where clause
            data: {
                githubId,
                username: login,
                ...(primaryEmail && { email: primaryEmail })
            }
        });
        console.log(`[AUTH] Updated existing user: ${login} (id: ${user.id})`);
    } else {
        // Create — NEVER include id here, let autoincrement handle it
        const createData = {
            githubId,
            username: login,
        };
        if (primaryEmail) createData.email = primaryEmail;

        user = await prisma.user.create({ data: createData });
        console.log(`[AUTH] Created new user: ${login} (id: ${user.id})`);
    }

    // Sanity check — if id is somehow still null, throw before JWT is created
    if (!user.id) {
        throw new Error(`User was saved but has no id. This indicates a DB sequence issue. Run the health check script.`);
    }

    return user;
}

// ─────────────────────────────────────
// Helper: Sign JWT for a user
// ─────────────────────────────────────
function signToken(user) {
    return jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// ─────────────────────────────────────
// Controller
// ─────────────────────────────────────
class AuthController {

    // Step 1: Redirect user to GitHub OAuth
    async githubAuth(req, res) {
        const client_id = process.env.GITHUB_CLIENT_ID;
        if (!client_id || client_id === 'YOUR_CLIENT_ID_HERE') {
            return res.status(500).send('GITHUB_CLIENT_ID is not configured on the server.');
        }

        const { port } = req.query;
        const state = port ? Buffer.from(JSON.stringify({ port })).toString('base64') : '';
        const redirect_uri = `${req.protocol}://${req.get('host')}/auth/github/callback`;
        const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=user:email&state=${state}`;

        console.log(`[AUTH] Redirecting to GitHub OAuth`);
        res.redirect(url);
    }

    // Step 2: GitHub redirects back here with a code
    async githubCallback(req, res) {
        const { code, state } = req.query;
        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        if (!code) {
            return res.status(400).send('No code provided from GitHub.');
        }
        if (!client_secret || client_secret === 'REPLACE_THIS_WITH_YOUR_SECRET') {
            return res.status(500).send('GITHUB_CLIENT_SECRET is not configured on the server.');
        }

        try {
            // Exchange code for access token
            const tokenRes = await axios.post(
                'https://github.com/login/oauth/access_token',
                { client_id, client_secret, code },
                { headers: { Accept: 'application/json' } }
            );

            if (tokenRes.data.error) {
                return res.status(400).send(`GitHub OAuth Error: ${tokenRes.data.error_description}`);
            }

            const github_token = tokenRes.data.access_token;
            const { login, githubId, primaryEmail } = await getGitHubProfile(github_token);
            const user = await safeUpsertUser({ githubId, login, primaryEmail });
            const token = signToken(user);

            // Redirect back to CLI if port was in state
            if (state) {
                try {
                    const { port } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
                    if (port) {
                        return res.redirect(`http://localhost:${port}/callback?token=${token}&username=${login}`);
                    }
                } catch (e) {
                    console.error('[AUTH] Failed to parse state param:', e.message);
                }
            }

            // Fallback for non-CLI flows
            res.send(`
                <h1>Login Successful ✅</h1>
                <p>You can close this window.</p>
                <p>Token: <code>${token}</code></p>
            `);

        } catch (error) {
            console.error('[AUTH] githubCallback Error:', error.message);
            res.status(500).send('Authentication failed. Check server logs.');
        }
    }

    // CLI token exchange: CLI sends GitHub token, gets back a JWT
    async exchange(req, res) {
        const { github_token } = req.body;

        if (!github_token) {
            return res.status(400).json({ error: 'github_token is required' });
        }

        try {
            const { login, githubId, primaryEmail } = await getGitHubProfile(github_token);
            const user = await safeUpsertUser({ githubId, login, primaryEmail });
            const token = signToken(user);

            console.log(`[AUTH] Exchange successful for: ${login} (id: ${user.id})`);
            res.json({ success: true, token });

        } catch (error) {
            console.error('[AUTH] Exchange Error:', error.message);

            if (error.response) {
                console.error('[AUTH] GitHub API Status:', error.response.status);
                console.error('[AUTH] GitHub API Data:', JSON.stringify(error.response.data, null, 2));
            }

            res.status(500).json({
                error: 'Token exchange failed',
                message: error.message,
                details: error.response?.data || null
            });
        }
    }
}

module.exports = new AuthController();