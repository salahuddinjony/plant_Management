import { Types } from "mongoose";

export type TPasswordResetSession = {
    userId: Types.ObjectId;
    resetTokenHash: string;
    expiresAt: Date;
    isUsed: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
