import { db, documents, users } from "@minidrive/db";
import { eq, and, desc } from "drizzle-orm";

export const documentRepository = {
  async create(data: {
    actuacionId: string;
    folder: string;
    filename: string;
    storageKey: string;
    mimeType: string;
    size: number;
    uploadedById: string;
  }) {
    const result = await db.insert(documents).values(data).returning();
    return result[0];
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async findByActuacionAndFolder(actuacionId: string, folder: string) {
    return db
      .select({
        id: documents.id,
        actuacionId: documents.actuacionId,
        folder: documents.folder,
        filename: documents.filename,
        storageKey: documents.storageKey,
        mimeType: documents.mimeType,
        size: documents.size,
        uploadedById: documents.uploadedById,
        uploadedByName: users.name,
        uploadedAt: documents.uploadedAt,
      })
      .from(documents)
      .innerJoin(users, eq(documents.uploadedById, users.id))
      .where(
        and(
          eq(documents.actuacionId, actuacionId),
          eq(documents.folder, folder as "postes" | "camaras" | "fachadas" | "fotos" | "planos"),
        ),
      )
      .orderBy(desc(documents.uploadedAt));
  },

  async deleteById(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  },
};
