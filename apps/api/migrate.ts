
import { initDB } from './lib/db';

async function runMigration() {
    try {
        console.log('[Migration] Starting database initialization...');
        await initDB();
        console.log('[Migration] Database initialization complete.');
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Failed to initialize database:', error);
        process.exit(1);
    }
}

runMigration();
