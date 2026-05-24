import { TPaymentAccountType } from "./payment-method.constants";

export type TPaymentMethod = {
    methodName: string;
    description?: string;
    accountNumber: string;
    accountName: string;
    accountType: TPaymentAccountType;
    /** Required when `accountType` is `Bank`. */
    branchName?: string;
    instructions?: string;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
};
