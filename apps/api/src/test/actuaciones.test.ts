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
    sql`TRUNCATE users, sessions, accounts, verifications, actuaciones, documents CASCADE`,
  );
});

describe("POST /api/actuaciones", () => {
  it("creates actuacion as admin → 201", async () => {
    const { cookies, user } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin",
      role: "admin",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Test" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Actuacion Test");
    expect(body.createdById).toBe(user.id);
  });

  it("returns 403 as regular user", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "user@test.com",
      password: "password123",
      name: "User",
      role: "user",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Forbidden" },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe("GET /api/actuaciones", () => {
  it("returns list with pagination", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "superadmin@test.com",
      password: "password123",
      name: "Super Admin",
      role: "superadmin",
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion 1" },
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion 2" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones?page=1&limit=10",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
  });
});

describe("GET /api/actuaciones/:id", () => {
  it("returns detail with folderCounts", async () => {
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
      payload: { name: "Actuacion Detail" },
    });

    const created = createRes.json();

    const res = await app.inject({
      method: "GET",
      url: `/api/actuaciones/${created.id}`,
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(created.id);
    expect(body.name).toBe("Actuacion Detail");
    expect(typeof body.folderCounts).toBe("object");
  });

  it("returns 404 for non-existent id", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "superadmin@test.com",
      password: "password123",
      name: "Super Admin",
      role: "superadmin",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones/00000000-0000-0000-0000-000000000000",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/actuaciones/:id", () => {
  it("superadmin can delete any actuacion → 200", async () => {
    const { cookies: adminCookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin",
      role: "admin",
    });

    const { cookies: superCookies } = await createAuthenticatedUser(app, {
      email: "superadmin@test.com",
      password: "password123",
      name: "Super Admin",
      role: "superadmin",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: adminCookies },
      payload: { name: "Actuacion to Delete" },
    });

    const created = createRes.json();

    const res = await app.inject({
      method: "DELETE",
      url: `/api/actuaciones/${created.id}`,
      headers: { cookie: superCookies },
    });

    expect(res.statusCode).toBe(200);
  });

  it("admin can delete own actuacion → 200", async () => {
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
      payload: { name: "Own Actuacion" },
    });

    const created = createRes.json();

    const res = await app.inject({
      method: "DELETE",
      url: `/api/actuaciones/${created.id}`,
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
  });

  it("admin cannot delete another admin's actuacion → 403", async () => {
    const { cookies: adminACookies } = await createAuthenticatedUser(app, {
      email: "admina@test.com",
      password: "password123",
      name: "Admin A",
      role: "admin",
    });

    const { cookies: adminBCookies } = await createAuthenticatedUser(app, {
      email: "adminb@test.com",
      password: "password123",
      name: "Admin B",
      role: "admin",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: adminACookies },
      payload: { name: "Admin A Actuacion" },
    });

    const created = createRes.json();

    const res = await app.inject({
      method: "DELETE",
      url: `/api/actuaciones/${created.id}`,
      headers: { cookie: adminBCookies },
    });

    expect(res.statusCode).toBe(403);
  });
});
