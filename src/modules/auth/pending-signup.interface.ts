import { TUserRole } from "../users/users.interface";

export type TPendingSignup = {
    emailOrPhone: string;
    name: string;
    password: string;
    profilePicture?: string;
    role: TUserRole;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
};
