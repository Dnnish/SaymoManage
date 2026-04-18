import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { db } from "@minidrive/db";
import { sql } from "drizzle-orm";
import { buildApp, createAuthenticatedUser } from "./setup.js";
import { ensureBucket } from "../lib/s3-client.js";
import { imageService } from "../services/image-service.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  await ensureBucket();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE users, sessions, accounts, verifications, actuaciones, documents, pets CASCADE`,
  );
});

// --- Image buffer helpers ---

async function createPngBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
}

async function createWebpBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .webp()
    .toBuffer();
}

async function createJpegBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .jpeg()
    .toBuffer();
}

// --- Multipart helper (no folder field for pets) ---

function createMultipartPayload(file: {
  fieldname: string;
  filename: string;
  content: Buffer;
  contentType: string;
}) {
  const boundary = "----TestBoundary" + Date.now();
  const parts: Buffer[] = [];

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
  );
  parts.push(file.content);
  parts.push(Buffer.from("\r\n"));
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

// --- imageService unit tests (kept here for colocation) ---

describe("imageService (unit)", () => {
  it("converts PNG to JPG — produces valid JPEG buffer", async () => {
    const png = await createPngBuffer();
    const jpg = await imageService.convertToJpg(png);

    const metadata = await sharp(jpg).metadata();
    expect(metadata.format).toBe("jpeg");
  });

  it("JPG passthrough — isJpeg returns true", async () => {
    expect(imageService.isJpeg("image/jpeg")).toBe(true);
    expect(imageService.isJpeg("image/png")).toBe(false);
  });

  it("replaces extension correctly", () => {
    expect(imageService.replaceExtensionWithJpg("photo.png")).toBe("photo.jpg");
    expect(imageService.replaceExtensionWithJpg("image.webp")).toBe("image.jpg");
    expect(imageService.replaceExtensionWithJpg("file")).toBe("file.jpg");
    expect(imageService.replaceExtensionWithJpg("my.photo.heic")).toBe("my.photo.jpg");
  });
});

// --- PETs API integration tests ---

describe("POST /api/pets", () => {
  it("upload PNG → saved as .jpg with mime image/jpeg", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const pngBuffer = await createPngBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "captura.png",
      content: pngBuffer,
      contentType: "image/png",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const pet = res.json();
    expect(pet.filename).toBe("captura.jpg");
    expect(pet.mimeType).toBe("image/jpeg");
  });

  it("upload WEBP → saved as .jpg with mime image/jpeg", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const webpBuffer = await createWebpBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "foto.webp",
      content: webpBuffer,
      contentType: "image/webp",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const pet = res.json();
    expect(pet.filename).toBe("foto.jpg");
    expect(pet.mimeType).toBe("image/jpeg");
  });

  it("upload JPG → no reconversion, keeps .jpg", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const jpegBuffer = await createJpegBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "original.jpg",
      content: jpegBuffer,
      contentType: "image/jpeg",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const pet = res.json();
    expect(pet.filename).toBe("original.jpg");
    expect(pet.mimeType).toBe("image/jpeg");
  });

  it("upload non-image (PDF) → 400", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const pdfBuffer = Buffer.from("%PDF-1.4 test content");
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "documento.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    const responseBody = res.json();
    expect(responseBody.error).toContain("no permitido");
  });

  it("unauthenticated → 401", async () => {
    const pngBuffer = await createPngBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "captura.png",
      content: pngBuffer,
      contentType: "image/png",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { "content-type": contentType },
      payload: body,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/pets", () => {
  it("returns list of pets with uploadedByName", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    // Upload two pets
    const jpegBuffer = await createJpegBuffer();
    for (const name of ["first.jpg", "second.jpg"]) {
      const { body, contentType } = createMultipartPayload({
        fieldname: "file",
        filename: name,
        content: jpegBuffer,
        contentType: "image/jpeg",
      });
      await app.inject({
        method: "POST",
        url: "/api/pets",
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/pets",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(200);
    const pets = res.json();
    expect(pets).toHaveLength(2);
    expect(pets[0].uploadedByName).toBe("Admin User");
    expect(pets[0].mimeType).toBe("image/jpeg");
  });
});

describe("GET /api/pets/:id/download", () => {
  it("returns file with correct Content-Type and Content-Disposition", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const jpegBuffer = await createJpegBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "download-test.jpg",
      content: jpegBuffer,
      contentType: "image/jpeg",
    });

    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });
    expect(uploadRes.statusCode).toBe(201);
    const pet = uploadRes.json();

    const dlRes = await app.inject({
      method: "GET",
      url: `/api/pets/${pet.id}/download`,
      headers: { cookie: cookies },
    });

    expect(dlRes.statusCode).toBe(200);
    expect(dlRes.headers["content-type"]).toBe("image/jpeg");
    expect(dlRes.headers["content-disposition"]).toContain("download-test.jpg");
  });

  it("non-existent pet → 404", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/pets/00000000-0000-0000-0000-000000000000/download",
      headers: { cookie: cookies },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/pets/:id", () => {
  it("admin can delete a pet → 200", async () => {
    const { cookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "admin",
    });

    const jpegBuffer = await createJpegBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "delete-me.jpg",
      content: jpegBuffer,
      contentType: "image/jpeg",
    });

    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: cookies, "content-type": contentType },
      payload: body,
    });
    expect(uploadRes.statusCode).toBe(201);
    const pet = uploadRes.json();

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/pets/${pet.id}`,
      headers: { cookie: cookies },
    });

    expect(deleteRes.statusCode).toBe(200);

    // Confirm it's gone from the list
    const listRes = await app.inject({
      method: "GET",
      url: "/api/pets",
      headers: { cookie: cookies },
    });
    expect(listRes.json()).toHaveLength(0);
  });

  it("regular user cannot delete a pet → 403", async () => {
    const { cookies: adminCookies } = await createAuthenticatedUser(app, {
      email: "admin@test.com",
      password: "password123",
      name: "Admin User",
      role: "superadmin",
    });

    const { cookies: userCookies } = await createAuthenticatedUser(app, {
      email: "user@test.com",
      password: "password123",
      name: "Regular User",
      role: "user",
    });

    const jpegBuffer = await createJpegBuffer();
    const { body, contentType } = createMultipartPayload({
      fieldname: "file",
      filename: "protected.jpg",
      content: jpegBuffer,
      contentType: "image/jpeg",
    });

    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/pets",
      headers: { cookie: adminCookies, "content-type": contentType },
      payload: body,
    });
    expect(uploadRes.statusCode).toBe(201);
    const pet = uploadRes.json();

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/pets/${pet.id}`,
      headers: { cookie: userCookies },
    });

    expect(deleteRes.statusCode).toBe(403);
  });
});
