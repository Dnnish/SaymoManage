import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authRoutes from "./routes/auth-routes.js";
import userRoutes from "./routes/user-routes.js";
import actuacionRoutes from "./routes/actuacion-routes.js";
import documentRoutes from "./routes/document-routes.js";
import { ensureBucket } from "./lib/s3-client.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: "http://localhost:5173",
  credentials: true,
});

await app.register(errorHandlerPlugin);
await app.register(authPlugin);
await app.register(authRoutes);
await app.register(userRoutes);
await app.register(actuacionRoutes);
await app.register(documentRoutes);

app.get("/api/health", async () => {
  return { status: "ok" };
});

await ensureBucket();

await app.listen({
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.API_HOST ?? "0.0.0.0",
});
