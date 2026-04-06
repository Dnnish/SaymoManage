import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import authPlugin from "../plugins/auth.js";
import authRoutes from "../routes/auth-routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(authPlugin);
  await app.register(authRoutes);

  app.get("/api/health", async () => {
    return { status: "ok" };
  });

  return app;
}

export function extractCookies(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers["set-cookie"];
  if (!setCookie) return "";
  if (Array.isArray(setCookie)) return setCookie.join("; ");
  return setCookie;
}
