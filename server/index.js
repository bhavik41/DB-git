const app = require('./src/app');
const runDBHealthCheck = require('./src/dbHealthCheck');

const PORT = process.env.PORT || 3000;

async function startServer() {
    await runDBHealthCheck();
    app.listen(PORT, () => {
        console.log(`
  🚀 DB-Git Backend Server
  📡 Listening on http://localhost:${PORT}
  🛠️  MVC & Services structure active
        `);
    });
}

startServer().catch(err => {
    console.error('[FATAL] Server failed to start:', err.message);
    process.exit(1);
});