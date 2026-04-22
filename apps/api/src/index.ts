import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authRoutes from "./routes/auth-routes.js";
import userRoutes from "./routes/user-routes.js";
import actuacionRoutes from "./routes/actuacion-routes.js";
import documentRoutes from "./routes/document-routes.js";
import petRoutes from "./routes/pet-routes.js";
import petFolderRoutes from "./routes/pet-folder-routes.js";
import { ensureBucket } from "./lib/s3-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  credentials: true,
});

await app.register(errorHandlerPlugin);
await app.register(authPlugin);
await app.register(authRoutes);
await app.register(userRoutes);
await app.register(actuacionRoutes);
await app.register(documentRoutes);
await app.register(petRoutes);
await app.register(petFolderRoutes);

app.get("/api/health", async () => {
  return { status: "ok" };
});

// In production, serve the frontend static files
if (isProduction) {
  const webDist = path.resolve(__dirname, "../../web/dist");
  if (fs.existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Ruta no encontrada" });
      }
      return reply.sendFile("index.html");
    });
  }
}

await ensureBucket();

await app.listen({
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.API_HOST ?? "0.0.0.0",
});
