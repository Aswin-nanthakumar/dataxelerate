'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { getDb } = require('./config/database');
const { getCache } = require('./config/redis');

async function main() {
  // Eagerly initialise backends so the first request is warm.
  const db = await getDb();
  const cache = await getCache();
  console.log(`[boot] data adapter: ${db.kind}, cache adapter: ${cache.kind}`);

  // Zero-config boot: hydrate the demo dataset automatically when the memory
  // adapter is active and empty (CI, previews, local demos).
  if (db.kind === 'memory') {
    const { seed } = require('./migrations/seed');
    await seed(db);
  }

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[boot] URBANFLOW backend listening on :${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`[shutdown] ${signal} received`);
    server.close(async () => {
      const { closeDb } = require('./config/database');
      const { closeCache } = require('./config/redis');
      await closeDb(); await closeCache();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[boot] fatal:', err);
  process.exit(1);
});
