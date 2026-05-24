import AppError from "../../errors/AppError";
import { ORDER_STATUS_ALIASES, ORDER_STATUSES, TOrderStatus } from "./order.constants";

/**
 * Parse comma-separated orderStatus query values (supports aliases e.g. cancel, delivery).
 */
export const parseOrderStatusQuery = (raw?: string): TOrderStatus[] | undefined => {
    if (!raw?.trim()) {
        return undefined;
    }

    const parts = raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    if (parts.length === 0) {
        return undefined;
    }

    const statuses = new Set<TOrderStatus>();

    for (const part of parts) {
        const normalized = ORDER_STATUS_ALIASES[part];
        if (!normalized) {
            throw new AppError(
                400,
                `Invalid orderStatus "${part}". Allowed: ${ORDER_STATUSES.join(", ")} (aliases: delivery, cancel)`
            );
        }
        statuses.add(normalized);
    }

    return [...statuses];
};
