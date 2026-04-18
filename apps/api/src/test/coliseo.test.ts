import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { db } from "@minidrive/db";
import { sql } from "drizzle-orm";
import { buildApp, createAuthenticatedUser } from "./setup.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE users, sessions, accounts, verifications, actuaciones, documents, pets CASCADE`,
  );
});

describe("PATCH /api/actuaciones/:id/coliseo", () => {
  it("toggle coliseo as admin → 200, status changes", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin",
      role: "admin",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Coliseo" },
    });

    const actuacion = createRes.json();
    expect(actuacion.coliseoStatus).toBe(false);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/actuaciones/${actuacion.id}/coliseo`,
      headers: { cookie: cookies },
      payload: { status: true },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.coliseoStatus).toBe(true);

    // Toggle back
    const res2 = await app.inject({
      method: "PATCH",
      url: `/api/actuaciones/${actuacion.id}/coliseo`,
      headers: { cookie: cookies },
      payload: { status: false },
    });

    expect(res2.statusCode).toBe(200);
    expect(res2.json().coliseoStatus).toBe(false);
  });

  it("toggle coliseo as user → 403", async () => {
    const { cookies: adminCookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin",
      role: "admin",
    });

    const { cookies: userCookies } = await createAuthenticatedUser(app, {
      email: "user@test.com",
      password: "password123",
      name: "Regular User",
      role: "user",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: adminCookies },
      payload: { name: "Actuacion Forbidden" },
    });

    const actuacion = createRes.json();

    const res = await app.inject({
      method: "PATCH",
      url: `/api/actuaciones/${actuacion.id}/coliseo`,
      headers: { cookie: userCookies },
      payload: { status: true },
    });

    expect(res.statusCode).toBe(403);
  });

  it("updated_at changes after toggle", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "superadmin@test.com",
      password: "password123",
      name: "Super Admin",
      role: "superadmin",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Timestamp" },
    });

    const actuacion = createRes.json();
    const originalUpdatedAt = actuacion.updatedAt;

    // Small delay to ensure timestamp differs
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await app.inject({
      method: "PATCH",
      url: `/api/actuaciones/${actuacion.id}/coliseo`,
      headers: { cookie: cookies },
      payload: { status: true },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime(),
    );
  });
});
