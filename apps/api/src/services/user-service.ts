import type { CreateUserInput, UpdateUserInput } from "@minidrive/shared";
import { codeToEmail, PROTECTED_ADMIN_EMAIL } from "@minidrive/shared";
import { db, sessions } from "@minidrive/db";
import { eq } from "drizzle-orm";
import { userRepository } from "../repositories/user-repository.js";
import { auth } from "../lib/auth.js";

export const userService = {
  async list(includeDeleted = false) {
    const users = await userRepository.findAll(includeDeleted);
    return users.map(sanitizeUser);
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) return null;
    return sanitizeUser(user);
  },

  async create(input: CreateUserInput) {
    const email = codeToEmail(input.code);
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError("Ya existe un usuario con ese código");
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password: input.password,
        name: input.name,
      },
    });

    if (!result?.user) {
      throw new Error("Error al crear usuario");
    }

    if (input.role && input.role !== "user") {
      await userRepository.updateById(result.user.id, { role: input.role });
    }

    const user = await userRepository.findById(result.user.id);
    return sanitizeUser(user!);
  },

  async update(id: string, input: UpdateUserInput) {
    const user = await userRepository.findById(id);
    if (!user) return null;

    if (user.email === PROTECTED_ADMIN_EMAIL) {
      throw new ProtectedAccountError("Esta cuenta es fija y no puede modificarse");
    }

    const updateData: Record<string, unknown> = {};
    if (input.name) updateData.name = input.name;
    if (input.role) updateData.role = input.role;

    if (input.code) {
      const email = codeToEmail(input.code);
      if (email !== user.email) {
        const existing = await userRepository.findByEmail(email);
        if (existing) {
          throw new ConflictError("Ya existe un usuario con ese código");
        }
        updateData.email = email;
      }
    }

    const updated = await userRepository.updateById(id, updateData);
    return updated ? sanitizeUser(updated) : null;
  },

  async softDelete(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new SelfDeleteError("No puedes eliminarte a ti mismo");
    }

    const user = await userRepository.findById(id);
    if (!user) return null;

    if (user.email === PROTECTED_ADMIN_EMAIL) {
      throw new ProtectedAccountError("Esta cuenta es fija y no puede eliminarse");
    }

    if (user.role === "superadmin") {
      throw new ForbiddenDeleteError("No se puede eliminar a un superadmin");
    }

    const deleted = await userRepository.softDelete(id);
    if (deleted) {
      await db.delete(sessions).where(eq(sessions.userId, id));
    }
    return deleted ? sanitizeUser(deleted) : null;
  },

  async restore(id: string) {
    const user = await userRepository.findById(id);
    if (!user) return null;

    const restored = await userRepository.restore(id);
    return restored ? sanitizeUser(restored) : null;
  },
};

function sanitizeUser(user: Record<string, unknown>) {
  const { deletedAt, ...rest } = user as Record<string, unknown>;
  return { ...rest, deletedAt };
}

export class ProtectedAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtectedAccountError";
  }
}

export class ForbiddenDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenDeleteError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class SelfDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfDeleteError";
  }
}
