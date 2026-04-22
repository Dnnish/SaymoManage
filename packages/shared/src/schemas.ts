import { z } from "zod";
import { ROLES, FOLDERS } from "./types.js";

// --- User schemas ---

export const createUserSchema = z.object({
  code: z
    .string()
    .min(1, "El código es requerido")
    .regex(/^\d{7,15}$/, "El código debe tener entre 7 y 15 dígitos numéricos"),
  password: z.string().min(8, "La password debe tener al menos 8 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(20, "El nombre no puede superar 20 caracteres"),
  role: z.enum(ROLES).default("user"),
});

export const updateUserSchema = z.object({
  code: z
    .string()
    .regex(/^\d{7,15}$/, "El código debe tener entre 7 y 15 dígitos numéricos")
    .optional(),
  name: z.string().min(1).max(20, "El nombre no puede superar 20 caracteres").optional(),
  role: z.enum(ROLES).optional(),
});

// --- Actuacion schemas ---

export const createActuacionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre no puede superar 50 caracteres"),
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
  sortBy: z.enum(["date", "name"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  coliseoStatus: z.enum(["all", "true", "false"]).default("all"),
});

// --- Inferred types ---

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateActuacionInput = z.infer<typeof createActuacionSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchActuacionesInput = z.infer<typeof searchActuacionesSchema>;
