import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./db/client";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
