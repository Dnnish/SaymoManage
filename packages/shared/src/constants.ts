import { Folder } from "./types.js";

export const ALLOWED_MIME_TYPES: Record<Folder, string[]> = {
  [Folder.POSTES]: ["application/pdf"],
  [Folder.CAMARAS]: ["application/pdf"],
  [Folder.FACHADAS]: ["application/pdf"],
  [Folder.FOTOS]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
  ],
  [Folder.PETS]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
  ],
  [Folder.PLANOS]: [
    "application/pdf",
    "application/vnd.google-earth.kmz",
  ],
};

export function isValidMimeType(folder: Folder, mimeType: string): boolean {
  const allowed = ALLOWED_MIME_TYPES[folder];

  if (folder === Folder.FOTOS) {
    return mimeType.startsWith("image/");
  }

  if (folder === Folder.PETS) {
    return mimeType.startsWith("image/");
  }

  return allowed.includes(mimeType);
}
