import { z } from "zod";
import { ROLES, FOLDERS } from "./types.js";

// --- User schemas ---

export const createUserSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "La password debe tener al menos 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255),
  role: z.enum(ROLES).default("user"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Email invalido").optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(ROLES).optional(),
});

// --- Actuacion schemas ---

export const createActuacionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(500),
});

// --- Document schemas ---

export const folderSchema = z.enum(FOLDERS);

export const uploadDocumentSchema = z.object({
  folder: folderSchema,
});

// --- Query schemas ---

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchActuacionesSchema = paginationSchema.extend({
  search: z.string().optional(),
});

// --- Inferred types ---

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateActuacionInput = z.infer<typeof createActuacionSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchActuacionesInput = z.infer<typeof searchActuacionesSchema>;
