import { TPurchaseDisclaimerType } from "./purchase-disclaimer.constants";

export type TPurchaseDisclaimer = {
    title: string;
    message: string;
    type: TPurchaseDisclaimerType;
    isActive: boolean;
    orderNumber: number;
    createdAt?: Date;
    updatedAt?: Date;
};
