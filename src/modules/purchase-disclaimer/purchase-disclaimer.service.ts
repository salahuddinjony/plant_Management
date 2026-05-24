import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../../errors/AppError";
import { TPurchaseDisclaimerType } from "./purchase-disclaimer.constants";
import { PurchaseDisclaimerModel } from "./purchase-disclaimer.model";

const getMaxOrderNumber = async (session?: mongoose.ClientSession) => {
    const latest = await PurchaseDisclaimerModel.findOne()
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .session(session ?? null)
        .lean();

    return latest?.orderNumber ?? 0;
};

const getTotalCount = async (session?: mongoose.ClientSession) => {
    return PurchaseDisclaimerModel.countDocuments().session(session ?? null);
};

const shiftOrdersFrom = async (
    fromOrder: number,
    delta: number,
    excludeId: mongoose.Types.ObjectId | null,
    session: mongoose.ClientSession
) => {
    const filter: Record<string, unknown> = { orderNumber: { $gte: fromOrder } };
    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    if (delta > 0) {
        await PurchaseDisclaimerModel.updateMany(filter, { $inc: { orderNumber: delta } }, { session });
        return;
    }

    if (delta < 0) {
        await PurchaseDisclaimerModel.updateMany(filter, { $inc: { orderNumber: delta } }, { session });
    }
};

const reorderDisclaimer = async (
    id: string,
    newOrderNumber: number,
    session: mongoose.ClientSession
) => {
    const doc = await PurchaseDisclaimerModel.findById(id).session(session);
    if (!doc) {
        throw new AppError(httpStatus.NOT_FOUND, "Purchase disclaimer not found");
    }

    const total = await getTotalCount(session);
    if (newOrderNumber < 1 || newOrderNumber > total) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `orderNumber must be between 1 and ${total}`
        );
    }

    const oldOrder = doc.orderNumber;
    if (oldOrder === newOrderNumber) {
        return doc;
    }

    if (newOrderNumber < oldOrder) {
        await PurchaseDisclaimerModel.updateMany(
            {
                _id: { $ne: doc._id },
                orderNumber: { $gte: newOrderNumber, $lt: oldOrder },
            },
            { $inc: { orderNumber: 1 } },
            { session }
        );
    } else {
        await PurchaseDisclaimerModel.updateMany(
            {
                _id: { $ne: doc._id },
                orderNumber: { $gt: oldOrder, $lte: newOrderNumber },
            },
            { $inc: { orderNumber: -1 } },
            { session }
        );
    }

    doc.orderNumber = newOrderNumber;
    await doc.save({ session });
    return doc;
};

export const createPurchaseDisclaimerService = async (payload: {
    title: string;
    message: string;
    type: TPurchaseDisclaimerType;
    isActive?: boolean;
    orderNumber?: number;
}) => {
    const session = await mongoose.startSession();

    try {
        let created;
        await session.withTransaction(async () => {
            const maxOrder = await getMaxOrderNumber(session);
            let orderNumber: number;

            if (payload.orderNumber !== undefined) {
                const insertAt = payload.orderNumber;
                if (insertAt > maxOrder + 1) {
                    throw new AppError(
                        httpStatus.BAD_REQUEST,
                        `orderNumber cannot be greater than ${maxOrder + 1}`
                    );
                }
                await shiftOrdersFrom(insertAt, 1, null, session);
                orderNumber = insertAt;
            } else {
                orderNumber = maxOrder + 1;
            }

            [created] = await PurchaseDisclaimerModel.create(
                [
                    {
                        title: payload.title,
                        message: payload.message,
                        type: payload.type,
                        isActive: payload.isActive ?? true,
                        orderNumber,
                    },
                ],
                { session }
            );
        });

        return created!;
    } finally {
        session.endSession();
    }
};

export const getActivePurchaseDisclaimersService = async (type?: TPurchaseDisclaimerType) => {
    const filter: Record<string, unknown> = { isActive: true };
    if (type) {
        filter.type = type;
    }

    return PurchaseDisclaimerModel.find(filter)
        .select("title message type isActive orderNumber")
        .sort({ orderNumber: 1 })
        .lean();
};

export const getAllPurchaseDisclaimersAdminService = async () => {
    return PurchaseDisclaimerModel.find().sort({ orderNumber: 1 }).lean();
};

export const getPurchaseDisclaimerByIdService = async (id: string) => {
    const doc = await PurchaseDisclaimerModel.findById(id).lean();
    if (!doc) {
        throw new AppError(httpStatus.NOT_FOUND, "Purchase disclaimer not found");
    }
    return doc;
};

export const updatePurchaseDisclaimerService = async (
    id: string,
    updates: {
        title?: string;
        message?: string;
        type?: TPurchaseDisclaimerType;
        isActive?: boolean;
        orderNumber?: number;
    }
) => {
    const session = await mongoose.startSession();

    try {
        let result;
        await session.withTransaction(async () => {
            const doc = await PurchaseDisclaimerModel.findById(id).session(session);
            if (!doc) {
                throw new AppError(httpStatus.NOT_FOUND, "Purchase disclaimer not found");
            }

            if (updates.orderNumber !== undefined) {
                await reorderDisclaimer(id, updates.orderNumber, session);
            }

            const refreshed = await PurchaseDisclaimerModel.findById(id).session(session);
            if (!refreshed) {
                throw new AppError(httpStatus.NOT_FOUND, "Purchase disclaimer not found");
            }

            if (updates.title !== undefined) {
                refreshed.title = updates.title;
            }
            if (updates.message !== undefined) {
                refreshed.message = updates.message;
            }
            if (updates.type !== undefined) {
                refreshed.type = updates.type;
            }
            if (updates.isActive !== undefined) {
                refreshed.isActive = updates.isActive;
            }

            await refreshed.save({ session });
            result = refreshed.toObject();
        });

        return result!;
    } finally {
        session.endSession();
    }
};

export const deletePurchaseDisclaimerService = async (id: string) => {
    const session = await mongoose.startSession();

    try {
        let deleted;
        await session.withTransaction(async () => {
            const doc = await PurchaseDisclaimerModel.findById(id).session(session);
            if (!doc) {
                throw new AppError(httpStatus.NOT_FOUND, "Purchase disclaimer not found");
            }

            const removedOrder = doc.orderNumber;
            deleted = doc.toObject();
            await doc.deleteOne({ session });

            await PurchaseDisclaimerModel.updateMany(
                { orderNumber: { $gt: removedOrder } },
                { $inc: { orderNumber: -1 } },
                { session }
            );
        });

        return deleted!;
    } finally {
        session.endSession();
    }
};

/**
 * Apply full display order in one request (drag-and-drop list).
 * `orderedIds[0]` → orderNumber 1, etc. Must include every disclaimer id exactly once.
 */
export const reorderAllPurchaseDisclaimersService = async (orderedIds: string[]) => {
    const session = await mongoose.startSession();

    try {
        let result;
        await session.withTransaction(async () => {
            const all = await PurchaseDisclaimerModel.find()
                .select("_id")
                .session(session)
                .lean();

            if (all.length === 0) {
                throw new AppError(httpStatus.BAD_REQUEST, "No purchase disclaimers to reorder");
            }

            if (orderedIds.length !== all.length) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    `orderedIds must include all ${all.length} disclaimer(s)`
                );
            }

            const unique = new Set(orderedIds);
            if (unique.size !== orderedIds.length) {
                throw new AppError(httpStatus.BAD_REQUEST, "orderedIds contains duplicate ids");
            }

            const existingIds = new Set(all.map((d) => String(d._id)));
            for (const id of orderedIds) {
                if (!existingIds.has(id)) {
                    throw new AppError(
                        httpStatus.BAD_REQUEST,
                        `Unknown disclaimer id in orderedIds: ${id}`
                    );
                }
            }

            const tempOffset = all.length + 1000;
            for (let i = 0; i < orderedIds.length; i += 1) {
                await PurchaseDisclaimerModel.updateOne(
                    { _id: orderedIds[i] },
                    { $set: { orderNumber: tempOffset + i } },
                    { session }
                );
            }

            for (let i = 0; i < orderedIds.length; i += 1) {
                await PurchaseDisclaimerModel.updateOne(
                    { _id: orderedIds[i] },
                    { $set: { orderNumber: i + 1 } },
                    { session }
                );
            }

            result = await PurchaseDisclaimerModel.find()
                .sort({ orderNumber: 1 })
                .session(session)
                .lean();
        });

        return result!;
    } finally {
        session.endSession();
    }
};
