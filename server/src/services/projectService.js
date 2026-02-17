const prisma = require('../configs/db');

class ProjectService {
    /**
     * Create or retrieve a project by name.
     * Ensures the associated user exists (mocked for now).
     */
    async createProject(name, description, username) {
        // Check/Create User (Mock Auth)
        let user = await prisma.user.findFirst({ where: { username } });
        if (!user) {
            user = await prisma.user.create({
                data: { username, password: 'password' }
            });
        }

        // Upsert Project (Create if doesn't exist, update if it does)
        const project = await prisma.project.upsert({
            where: { name },
            update: { description },
            create: {
                name,
                description,
                userId: user.id
            }
        });

        return project;
    }

    /**
     * Find a project by name, including branches.
     */
    async getProjectByName(name) {
        return prisma.project.findUnique({
            where: { name },
            include: { branches: true }
        });
    }

    /**
     * Create a commit for a project.
     */
    async createCommit(projectName, { message, snapshot, diff, prevCommitId, branchName, author }) {
        const project = await prisma.project.findUnique({ where: { name: projectName } });
        if (!project) throw new Error('Project not found');

        // Handle Branch
        let branch = await prisma.branch.findUnique({
            where: { projectId_name: { projectId: project.id, name: branchName || 'main' } }
        });

        if (!branch) {
            branch = await prisma.branch.create({
                data: { name: branchName || 'main', projectId: project.id }
            });
        }

        // Create Commit
        const commit = await prisma.commit.create({
            data: {
                message,
                author,
                snapshot,
                diff,
                projectId: project.id,
                branchId: branch.id,
                prevCommitId: prevCommitId || branch.headCommitId
            }
        });

        // Update Branch Head
        await prisma.branch.update({
            where: { id: branch.id },
            data: { headCommitId: commit.id }
        });

        return commit;
    }

    /**
     * Get the latest commit for a project/branch.
     */
    async getLatestCommit(projectName, branchName = 'main') {
        const project = await prisma.project.findUnique({ where: { name: projectName } });
        if (!project) throw new Error('Project not found');

        const branch = await prisma.branch.findUnique({
            where: { projectId_name: { projectId: project.id, name: branchName } }
        });

        if (!branch || !branch.headCommitId) {
            return null;
        }

        return prisma.commit.findUnique({
            where: { id: branch.headCommitId }
        });
    }

    /**
     * Get commit history for a project.
     */
    async getCommitLog(projectName, limit = 20) {
        const project = await prisma.project.findUnique({ where: { name: projectName } });
        if (!project) throw new Error('Project not found');

        return prisma.commit.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    /**
     * Get a specific commit by ID.
     */
    async getCommitById(projectName, commitId) {
        // confirm project exists first
        const project = await prisma.project.findUnique({ where: { name: projectName } });
        if (!project) throw new Error('Project not found');

        return prisma.commit.findUnique({ where: { id: commitId } });
    }
}

module.exports = new ProjectService();
