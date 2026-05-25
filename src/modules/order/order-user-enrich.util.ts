import { Types } from "mongoose";
import { UserModel } from "../users/users.model";
import { ORDER_USER_POPULATE } from "./order.constants";
import { toPlainOrder } from "./order-plain.util";

const toUserIdString = (userId: unknown): string | null => {
    if (!userId) return null;
    if (typeof userId === "string") return userId;
    if (userId instanceof Types.ObjectId) return userId.toString();
    if (typeof userId === "object" && userId !== null && "_id" in userId) {
        const id = (userId as { _id?: Types.ObjectId | string })._id;
        return id ? String(id) : null;
    }
    return String(userId);
};

/**
 * Attach user documents to orders (reliable when userId is stored as string or ObjectId).
 */
export const enrichOrdersWithUsers = async <T extends { userId?: unknown }>(orders: T[]) => {
    if (orders.length === 0) return orders;

    const plainOrders = orders.map((order) => toPlainOrder(order));

    const userIdStrings = [
        ...new Set(
            plainOrders.map((o) => toUserIdString(o.userId)).filter((id): id is string => Boolean(id))
        ),
    ];

    if (userIdStrings.length === 0) return plainOrders;

    const objectIds = userIdStrings
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

    const users = await UserModel.find({ _id: { $in: objectIds } })
        .select("name emailOrPhone profilePicture avatarId role status")
        .populate({ path: "avatarId", select: "name imageUrl" })
        .lean();

    const userById = new Map(users.map((u) => [String(u._id), u]));

    return plainOrders.map((plain) => {
        const key = toUserIdString(plain.userId);
        if (key && userById.has(key)) {
            plain.userId = userById.get(key);
        }
        return plain as T;
    });
};
