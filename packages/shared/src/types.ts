export const Role = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  USER: "user",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES = [Role.SUPERADMIN, Role.ADMIN, Role.USER] as const;

export const Folder = {
  POSTES: "postes",
  CAMARAS: "camaras",
  FACHADAS: "fachadas",
  FOTOS: "fotos",
  PLANOS: "planos",
} as const;

export type Folder = (typeof Folder)[keyof typeof Folder];

export const FOLDERS = [
  Folder.POSTES,
  Folder.CAMARAS,
  Folder.FACHADAS,
  Folder.FOTOS,
  Folder.PLANOS,
] as const;
