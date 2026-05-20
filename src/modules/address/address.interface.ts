export type TAddress = {
    userId: string;
    street: string;
    city: string;
    postalCode?: string;
    country: string;
    phoneNumber?: string;
    label?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
};
