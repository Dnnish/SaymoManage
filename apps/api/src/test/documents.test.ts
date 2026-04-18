import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { db } from "@minidrive/db";
import { sql } from "drizzle-orm";
import { buildApp, createAuthenticatedUser } from "./setup.js";
import { ensureBucket } from "../lib/s3-client.js";

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

function createMultipartPayload(
  fields: Record<string, string>,
  file: {
    fieldname: string;
    filename: string;
    content: Buffer;
    contentType: string;
  },
) {
  const boundary = "----TestBoundary" + Date.now();
  const parts: Buffer[] = [];

  // Add string fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
      ),
    );
  }

  // Add file field
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
  );
  parts.push(file.content);
  parts.push(Buffer.from("\r\n"));

  // End boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function createTestActuacion(
  appInstance: FastifyInstance,
  cookies: string,
  name: string,
) {
  const res = await appInstance.inject({
    method: "POST",
    url: "/api/actuaciones",
    headers: { cookie: cookies },
    payload: { name },
  });
  return res.json();
}

describe("Documents", () => {
  describe("POST /api/actuaciones/:actuacionId/documents", () => {
    it("upload PDF to postes → 201", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      const { body, contentType } = createMultipartPayload(
        { folder: "postes" },
        {
          fieldname: "file",
          filename: "test.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const doc = res.json();
      expect(doc.filename).toBe("test.pdf");
      expect(doc.mimeType).toBe("application/pdf");
      expect(doc.folder).toBe("postes");
      expect(doc.actuacionId).toBe(actuacion.id);
    });

    it("upload image to postes → 400", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const imageBuffer = Buffer.from("fake-image-content");
      const { body, contentType } = createMultipartPayload(
        { folder: "postes" },
        {
          fieldname: "file",
          filename: "photo.png",
          content: imageBuffer,
          contentType: "image/png",
        },
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
      const body2 = res.json();
      expect(body2.error).toContain("postes");
    });

    it("upload image to fotos → 201", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const imageBuffer = Buffer.from("fake-image-content");
      const { body, contentType } = createMultipartPayload(
        { folder: "fotos" },
        {
          fieldname: "file",
          filename: "photo.jpg",
          content: imageBuffer,
          contentType: "image/jpeg",
        },
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const doc = res.json();
      expect(doc.folder).toBe("fotos");
      expect(doc.mimeType).toBe("image/jpeg");
    });

    it("upload PDF to planos → 201", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      const { body, contentType } = createMultipartPayload(
        { folder: "planos" },
        {
          fieldname: "file",
          filename: "plano.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const doc = res.json();
      expect(doc.folder).toBe("planos");
      expect(doc.mimeType).toBe("application/pdf");
    });

    it("upload KMZ to planos → 201", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const kmzBuffer = Buffer.from("fake-kmz-content");
      const { body, contentType } = createMultipartPayload(
        { folder: "planos" },
        {
          fieldname: "file",
          filename: "map.kmz",
          content: kmzBuffer,
          contentType: "application/vnd.google-earth.kmz",
        },
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const doc = res.json();
      expect(doc.folder).toBe("planos");
      expect(doc.mimeType).toBe("application/vnd.google-earth.kmz");
    });
  });

  describe("GET /api/actuaciones/:actuacionId/documents", () => {
    it("list documents by folder returns correct subset with uploadedByName", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const pdfBuffer = Buffer.from("%PDF-1.4 test content");

      // Upload 2 PDFs to postes
      for (const name of ["doc1.pdf", "doc2.pdf"]) {
        const { body, contentType } = createMultipartPayload(
          { folder: "postes" },
          {
            fieldname: "file",
            filename: name,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        );
        await app.inject({
          method: "POST",
          url: `/api/actuaciones/${actuacion.id}/documents`,
          headers: { cookie: cookies, "content-type": contentType },
          payload: body,
        });
      }

      // Upload 1 image to fotos
      const imageBuffer = Buffer.from("fake-image-content");
      const { body: imgBody, contentType: imgContentType } = createMultipartPayload(
        { folder: "fotos" },
        {
          fieldname: "file",
          filename: "photo.jpg",
          content: imageBuffer,
          contentType: "image/jpeg",
        },
      );
      await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": imgContentType },
        payload: imgBody,
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/actuaciones/${actuacion.id}/documents?folder=postes`,
        headers: { cookie: cookies },
      });

      expect(res.statusCode).toBe(200);
      const docs = res.json();
      expect(docs).toHaveLength(2);
      expect(docs[0].folder).toBe("postes");
      expect(docs[0].uploadedByName).toBe("Admin User");
    });
  });

  describe("DELETE /api/documents/:id", () => {
    it("delete document removes from DB and MinIO", async () => {
      const { cookies } = await createAuthenticatedUser(app, {
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "superadmin",
      });

      const actuacion = await createTestActuacion(app, cookies, "Actuacion Test");

      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      const { body, contentType } = createMultipartPayload(
        { folder: "postes" },
        {
          fieldname: "file",
          filename: "delete-me.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      );

      const uploadRes = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: cookies, "content-type": contentType },
        payload: body,
      });

      expect(uploadRes.statusCode).toBe(201);
      const doc = uploadRes.json();

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/documents/${doc.id}`,
        headers: { cookie: cookies },
      });

      expect(deleteRes.statusCode).toBe(200);

      const listRes = await app.inject({
        method: "GET",
        url: `/api/actuaciones/${actuacion.id}/documents?folder=postes`,
        headers: { cookie: cookies },
      });

      expect(listRes.statusCode).toBe(200);
      expect(listRes.json()).toHaveLength(0);
    });

    it("delete document as user → 403", async () => {
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

      const actuacion = await createTestActuacion(app, adminCookies, "Actuacion Test");

      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      const { body, contentType } = createMultipartPayload(
        { folder: "postes" },
        {
          fieldname: "file",
          filename: "protected.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      );

      const uploadRes = await app.inject({
        method: "POST",
        url: `/api/actuaciones/${actuacion.id}/documents`,
        headers: { cookie: adminCookies, "content-type": contentType },
        payload: body,
      });

      expect(uploadRes.statusCode).toBe(201);
      const doc = uploadRes.json();

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/documents/${doc.id}`,
        headers: { cookie: userCookies },
      });

      expect(deleteRes.statusCode).toBe(403);
    });
  });
});
