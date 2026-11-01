import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `AgroConnect API running at http://localhost:${env.PORT} in ${env.NODE_ENV} mode`,
  );
});

server.on("error", (error) => {
  console.error("Failed to start AgroConnect API:", error);
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received. Shutting down AgroConnect API...`);

  server.close((error) => {
    if (error) {
      console.error("Error while shutting down:", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
