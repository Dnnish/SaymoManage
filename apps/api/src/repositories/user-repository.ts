import { db, users } from "@minidrive/db";
import { eq, isNull, sql } from "drizzle-orm";

export const userRepository = {
  async findAll(includeDeleted = false) {
    const query = db.select().from(users);
    if (!includeDeleted) {
      return query.where(isNull(users.deletedAt));
    }
    return query;
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async findByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  },

  async updateById(id: string, data: { name?: string; email?: string; role?: string }) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? null;
  },

  async softDelete(id: string) {
    const result = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? null;
  },

  async restore(id: string) {
    const result = await db
      .update(users)
      .set({ deletedAt: sql`NULL`, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? null;
  },
};
