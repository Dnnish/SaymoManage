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
  ARQUETAS: "arquetas",
} as const;

export type Folder = (typeof Folder)[keyof typeof Folder];

export const FOLDERS = [
  Folder.POSTES,
  Folder.CAMARAS,
  Folder.FACHADAS,
  Folder.FOTOS,
  Folder.PLANOS,
  Folder.ARQUETAS,
] as const;

// Auth code helpers — code is stored as `{code}@minidrive.com` in Better Auth
export const AUTH_EMAIL_SUFFIX = "@minidrive.com";

// Protected system account — cannot be edited or deleted
export const PROTECTED_ADMIN_CODE = "0000000000";
export const PROTECTED_ADMIN_EMAIL = `${PROTECTED_ADMIN_CODE}${AUTH_EMAIL_SUFFIX}`;

export function codeToEmail(code: string): string {
  return `${code}${AUTH_EMAIL_SUFFIX}`;
}

export function emailToCode(email: string): string {
  return email.replace(AUTH_EMAIL_SUFFIX, "");
}
