import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  createActuacionSchema,
  folderSchema,
  paginationSchema,
} from "./schemas.js";

describe("createUserSchema", () => {
  it("accepts valid input", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
      name: "Test User",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to user", () => {
    const result = createUserSchema.parse({
      email: "test@example.com",
      password: "12345678",
      name: "Test User",
    });
    expect(result.role).toBe("user");
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      password: "12345678",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "123",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
      name: "Test",
      role: "root",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts partial updates", () => {
    expect(updateUserSchema.safeParse({ name: "New Name" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ email: "new@test.com" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ role: "admin" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(updateUserSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("createActuacionSchema", () => {
  it("accepts valid name", () => {
    const result = createActuacionSchema.safeParse({ name: "Instalacion Norte" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createActuacionSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("folderSchema", () => {
  it("accepts all valid folders", () => {
    const folders = ["postes", "camaras", "fachadas", "fotos", "pets", "planos"];
    for (const folder of folders) {
      expect(folderSchema.safeParse(folder).success).toBe(true);
    }
  });

  it("rejects invalid folder", () => {
    expect(folderSchema.safeParse("archivos").success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("defaults page to 1 and limit to 20", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects limit over 100", () => {
    expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false);
  });

  it("rejects negative page", () => {
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });
});
