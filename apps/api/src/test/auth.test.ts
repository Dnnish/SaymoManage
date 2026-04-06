import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { db, users } from "@minidrive/db";
import { sql } from "drizzle-orm";
import { buildApp, extractCookies } from "./setup.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await db.execute(sql`DELETE FROM sessions`);
  await db.execute(sql`DELETE FROM accounts`);
  await db.execute(sql`DELETE FROM users`);
});

describe("POST /api/auth/sign-up/email", () => {
  it("creates a user and returns session", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "test@example.com",
        password: "12345678",
        name: "Test User",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe("test@example.com");
    expect(body.user.name).toBe("Test User");
    expect(body.token ?? body.session).toBeDefined();
  });

  it("assigns role user by default", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "test@example.com",
        password: "12345678",
        name: "Test User",
      },
    });

    const body = res.json();
    expect(body.user.role).toBe("user");
  });

  it("rejects duplicate email", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "test@example.com",
        password: "12345678",
        name: "First",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "test@example.com",
        password: "12345678",
        name: "Second",
      },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("POST /api/auth/sign-in/email", () => {
  beforeEach(async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "login@example.com",
        password: "12345678",
        name: "Login User",
      },
    });
  });

  it("returns session with valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: {
        email: "login@example.com",
        password: "12345678",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token ?? body.session).toBeDefined();
    expect(body.user.email).toBe("login@example.com");
  });

  it("rejects invalid password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: {
        email: "login@example.com",
        password: "wrongpassword",
      },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without session", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns user with valid session", async () => {
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "me@example.com",
        password: "12345678",
        name: "Me User",
      },
    });

    const cookies = extractCookies(signUp);

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe("me@example.com");
    expect(body.name).toBe("Me User");
    expect(body.role).toBe("user");
    expect(body.id).toBeDefined();
  });

  it("rejects soft-deleted user", async () => {
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: "deleted@example.com",
        password: "12345678",
        name: "Deleted User",
      },
    });

    const cookies = extractCookies(signUp);
    const body = signUp.json();

    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(sql`id = ${body.user.id}`);

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(401);
  });
});
