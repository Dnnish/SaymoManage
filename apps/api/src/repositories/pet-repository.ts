import { db, pets, users } from "@minidrive/db";
import { eq, desc } from "drizzle-orm";

export const petRepository = {
  async create(data: {
    filename: string;
    storageKey: string;
    mimeType: string;
    size: number;
    uploadedById: string;
  }) {
    const result = await db.insert(pets).values(data).returning();
    return result[0];
  },

  async findAll() {
    return db
      .select({
        id: pets.id,
        filename: pets.filename,
        storageKey: pets.storageKey,
        mimeType: pets.mimeType,
        size: pets.size,
        uploadedById: pets.uploadedById,
        uploadedByName: users.name,
        uploadedAt: pets.uploadedAt,
      })
      .from(pets)
      .innerJoin(users, eq(pets.uploadedById, users.id))
      .orderBy(desc(pets.uploadedAt));
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(pets)
      .where(eq(pets.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async deleteById(id: string) {
    await db.delete(pets).where(eq(pets.id, id));
  },
};
