import { describe, it, expect } from "vitest";
import { ALLOWED_MIME_TYPES, isValidMimeType } from "./constants.js";
import { Folder } from "./types.js";

describe("ALLOWED_MIME_TYPES", () => {
  it("postes only allows PDF", () => {
    expect(ALLOWED_MIME_TYPES[Folder.POSTES]).toEqual(["application/pdf"]);
  });

  it("camaras only allows PDF", () => {
    expect(ALLOWED_MIME_TYPES[Folder.CAMARAS]).toEqual(["application/pdf"]);
  });

  it("fachadas only allows PDF", () => {
    expect(ALLOWED_MIME_TYPES[Folder.FACHADAS]).toEqual(["application/pdf"]);
  });

  it("fotos allows image types", () => {
    const types = ALLOWED_MIME_TYPES[Folder.FOTOS];
    expect(types).toContain("image/jpeg");
    expect(types).toContain("image/png");
    expect(types).toContain("image/webp");
  });

  it("pets allows image types", () => {
    const types = ALLOWED_MIME_TYPES[Folder.PETS];
    expect(types).toContain("image/jpeg");
    expect(types).toContain("image/png");
    expect(types).toContain("image/webp");
    expect(types).not.toContain("image/svg+xml");
  });

  it("planos allows PDF and KMZ", () => {
    expect(ALLOWED_MIME_TYPES[Folder.PLANOS]).toEqual([
      "application/pdf",
      "application/vnd.google-earth.kmz",
    ]);
  });

  it("every folder has at least one allowed type", () => {
    for (const folder of Object.values(Folder)) {
      expect(ALLOWED_MIME_TYPES[folder].length).toBeGreaterThan(0);
    }
  });
});

describe("isValidMimeType", () => {
  it("accepts PDF for postes", () => {
    expect(isValidMimeType(Folder.POSTES, "application/pdf")).toBe(true);
  });

  it("rejects image for postes", () => {
    expect(isValidMimeType(Folder.POSTES, "image/jpeg")).toBe(false);
  });

  it("accepts any image/* for fotos", () => {
    expect(isValidMimeType(Folder.FOTOS, "image/jpeg")).toBe(true);
    expect(isValidMimeType(Folder.FOTOS, "image/png")).toBe(true);
    expect(isValidMimeType(Folder.FOTOS, "image/heic")).toBe(true);
  });

  it("rejects PDF for fotos", () => {
    expect(isValidMimeType(Folder.FOTOS, "application/pdf")).toBe(false);
  });

  it("accepts any image/* for pets", () => {
    expect(isValidMimeType(Folder.PETS, "image/png")).toBe(true);
    expect(isValidMimeType(Folder.PETS, "image/webp")).toBe(true);
  });

  it("rejects PDF for pets", () => {
    expect(isValidMimeType(Folder.PETS, "application/pdf")).toBe(false);
  });

  it("accepts PDF for planos", () => {
    expect(isValidMimeType(Folder.PLANOS, "application/pdf")).toBe(true);
  });

  it("accepts KMZ for planos", () => {
    expect(isValidMimeType(Folder.PLANOS, "application/vnd.google-earth.kmz")).toBe(true);
  });

  it("rejects image for planos", () => {
    expect(isValidMimeType(Folder.PLANOS, "image/jpeg")).toBe(false);
  });
});
