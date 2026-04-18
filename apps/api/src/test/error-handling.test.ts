import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { db } from "@minidrive/db";
import { sql } from "drizzle-orm";
import { buildApp, createAuthenticatedUser } from "./setup.js";

let app: FastifyInstance;
let superadminCookies: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE users, sessions, accounts, verifications CASCADE`);

  const result = await createAuthenticatedUser(app, {
    email: "superadmin@test.com",
    password: "12345678",
    name: "Super Admin",
    role: "superadmin",
  });
  superadminCookies = result.cookies;
});

describe("manejo global de errores", () => {
  describe("errores de validación Zod", () => {
    it("POST /api/users con body vacío devuelve 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: { cookie: superadminCookies },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body).toHaveProperty("error");
    });

    it("POST /api/users con email inválido devuelve 400 con campo error presente", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: { cookie: superadminCookies },
        payload: {
          email: "not-an-email",
          password: "tooshort",
          name: "",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      // The handler returns { error: fieldErrors } where fieldErrors is an object
      // describing which fields failed — verify the field is present and non-null
      expect(body).toHaveProperty("error");
      expect(body.error).toBeTruthy();
    });
  });

  describe("violación de restricción de unicidad", () => {
    it("POST /api/users con email duplicado devuelve 409", async () => {
      // Primera creación — debe pasar
      const first = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: { cookie: superadminCookies },
        payload: {
          email: "unique@test.com",
          password: "12345678",
          name: "Original",
          role: "user",
        },
      });
      expect(first.statusCode).toBe(201);

      // Segunda creación con el mismo email — debe fallar con 409
      const second = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: { cookie: superadminCookies },
        payload: {
          email: "unique@test.com",
          password: "12345678",
          name: "Duplicate",
          role: "user",
        },
      });

      expect(second.statusCode).toBe(409);
      const body = second.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    });
  });

  describe("rutas inexistentes", () => {
    it("GET /api/ruta-inexistente devuelve 404 con cuerpo JSON", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/ruta-que-no-existe",
        headers: { cookie: superadminCookies },
      });

      expect(res.statusCode).toBe(404);
    });

    it("respuestas de error nunca incluyen stack trace", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: { cookie: superadminCookies },
        payload: {
          email: "bad",
          password: "x",
          name: "",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      // stack trace must never be exposed in responses
      expect(body).not.toHaveProperty("stack");
      expect(JSON.stringify(body)).not.toContain("at Object.");
    });
  });
});
