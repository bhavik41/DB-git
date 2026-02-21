const prisma = require('./configs/db');

async function runDBHealthCheck() {
    console.log('[DB Health] Running startup health check...');

    try {
        // 1. Delete NULL id rows
        for (const table of ['"User"', '"Project"', '"Branch"']) {
            const deleted = await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id IS NULL`);
            if (deleted > 0) console.warn(`[DB Health] ⚠️  Removed ${deleted} NULL id row(s) from ${table}`);
        }

        // 2. ALWAYS force-reset sequences — even if no NULL rows exist
        // This fixes corrupted sequences that cause autoincrement to return null
        await prisma.$executeRawUnsafe(`
            SELECT setval(
                pg_get_serial_sequence('"User"', 'id'),
                COALESCE((SELECT MAX(id) FROM "User"), 0) + 1,
                false
            )
        `);
        await prisma.$executeRawUnsafe(`
            SELECT setval(
                pg_get_serial_sequence('"Project"', 'id'),
                COALESCE((SELECT MAX(id) FROM "Project"), 0) + 1,
                false
            )
        `);
        await prisma.$executeRawUnsafe(`
            SELECT setval(
                pg_get_serial_sequence('"Branch"', 'id'),
                COALESCE((SELECT MAX(id) FROM "Branch"), 0) + 1,
                false
            )
        `);

        // 3. Delete orphaned Projects
        const orphans = await prisma.$executeRawUnsafe(`
            DELETE FROM "Project" WHERE "userId" NOT IN (SELECT id FROM "User")
        `);
        if (orphans > 0) console.warn(`[DB Health] ⚠️  Removed ${orphans} orphaned Project(s)`);

        console.log('[DB Health] ✅ Health check passed. DB is clean.');
    } catch (err) {
        console.error('[DB Health] ❌ Error during health check:', err.message);
        console.error('[DB Health] Server will continue, but DB may have issues.');
    }
}

module.exports = runDBHealthCheck;