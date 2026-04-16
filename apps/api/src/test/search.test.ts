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

describe("GET /api/actuaciones - trigram search", () => {
  it("fuzzy search finds matching actuacion", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Instalacion de Camaras en Zona Norte" },
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Reparacion de Postes" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones?search=camara",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("Instalacion de Camaras en Zona Norte");
  });

  it("empty search returns all actuaciones", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Alpha" },
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Actuacion Beta" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.data.length).toBe(2);
  });

  it("search with no results returns empty data array with total 0", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Instalacion de Postes" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones?search=xyznonexistent",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("search respects pagination: returns correct page size and total", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Camara Zona Norte" },
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Camara Zona Sur" },
    });

    await app.inject({
      method: "POST",
      url: "/api/actuaciones",
      headers: { cookie: cookies },
      payload: { name: "Camara Zona Este" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/actuaciones?search=camara&limit=2&page=1",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(2);
    expect(body.total).toBe(3);
  });
});
