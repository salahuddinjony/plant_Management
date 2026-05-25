/** Convert Mongoose order document(s) to plain JSON-safe objects. */
export const toPlainOrder = (order: unknown): Record<string, unknown> => {
    if (!order || typeof order !== "object") {
        return {};
    }

    const doc = order as {
        toObject?: (options?: { virtuals?: boolean }) => Record<string, unknown>;
        _doc?: Record<string, unknown>;
    };

    if (typeof doc.toObject === "function") {
        return doc.toObject({ virtuals: false });
    }

    if (doc._doc && typeof doc._doc === "object") {
        return { ...doc._doc };
    }

    return { ...(order as Record<string, unknown>) };
};

export const toPlainLineItem = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== "object") {
        return {};
    }
    const line = item as { toObject?: () => Record<string, unknown> };
    return typeof line.toObject === "function" ? line.toObject() : { ...(item as Record<string, unknown>) };
};
