import { TAddressLabel } from "./address.constants";

export type TAddress = {
    userId: string;
    street?: string;
    city: string;
    postalCode?: string;
    country: string;
    phoneNumber: string;
    label?: TAddressLabel;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type TAddressInput = {
    street?: string;
    city: string;
    postalCode?: string;
    country: string;
    phoneNumber: string;
    label?: TAddressLabel;
    isDefault?: boolean;
};
