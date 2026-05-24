import mongoose from "mongoose";

/** MongoDB collection names (pluralized by Mongoose). */
const COLLECTIONS_WITH_EXPIRES_TTL = [
    "otps",
    "password_reset_sessions",
    "pending_signups",
    "staff_invites",
] as const;

type IndexDescription = {
    name?: string;
    key?: Record<string, number>;
    expireAfterSeconds?: number;
};

const hasExpiresAtTtlIndex = (indexes: IndexDescription[]) =>
    indexes.some(
        (idx) =>
            idx.key?.expiresAt === 1 && idx.expireAfterSeconds === 0
    );

const findPlainExpiresAtIndex = (indexes: IndexDescription[]) =>
    indexes.find(
        (idx) =>
            idx.name &&
            idx.key &&
            Object.keys(idx.key).length === 1 &&
            idx.key.expiresAt === 1 &&
            idx.expireAfterSeconds === undefined
    );

/**
 * Replaces plain `expiresAt_1` indexes (no TTL) with TTL indexes so expired
 * documents are removed automatically by MongoDB.
 */
export const ensureTtlIndexes = async (): Promise<void> => {
    const db = mongoose.connection.db;
    if (!db) {
        return;
    }

    for (const collectionName of COLLECTIONS_WITH_EXPIRES_TTL) {
        try {
            const collection = db.collection(collectionName);
            const indexes = (await collection.indexes()) as IndexDescription[];

            const plainIndex = findPlainExpiresAtIndex(indexes);
            if (plainIndex?.name) {
                await collection.dropIndex(plainIndex.name);
                console.info(
                    `Dropped non-TTL index ${plainIndex.name} on ${collectionName}`
                );
            }

            const refreshed = plainIndex
                ? ((await collection.indexes()) as IndexDescription[])
                : indexes;
            if (!hasExpiresAtTtlIndex(refreshed)) {
                await collection.createIndex(
                    { expiresAt: 1 },
                    { expireAfterSeconds: 0, name: "expiresAt_1" }
                );
                console.info(`Created TTL index on ${collectionName}.expiresAt`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`TTL index setup for ${collectionName}: ${message}`);
        }
    }
};
