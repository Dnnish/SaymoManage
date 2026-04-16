import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import authPlugin from "../plugins/auth.js";
import authRoutes from "../routes/auth-routes.js";
import userRoutes from "../routes/user-routes.js";
import actuacionRoutes from "../routes/actuacion-routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(actuacionRoutes);

  app.get("/api/health", async () => {
    return { status: "ok" };
  });

  return app;
}

export async function createAuthenticatedUser(
  app: FastifyInstance,
  data: { email: string; password: string; name: string; role?: string },
): Promise<{ cookies: string; user: Record<string, unknown> }> {
  const { db, users } = await import("@minidrive/db");
  const { eq } = await import("drizzle-orm");

  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { email: data.email, password: data.password, name: data.name },
  });

  const body = res.json();
  const cookies = extractCookies(res);

  if (data.role && data.role !== "user") {
    await db.update(users).set({ role: data.role as "superadmin" | "admin" | "user" }).where(eq(users.id, body.user.id));
  }

  return { cookies, user: { ...body.user, role: data.role ?? "user" } };
}

export function extractCookies(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers["set-cookie"];
  if (!setCookie) return "";
  if (Array.isArray(setCookie)) return setCookie.join("; ");
  return setCookie;
}
