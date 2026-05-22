import AppError from "../../errors/AppError";
import { DEFAULT_ADDRESS_LABEL } from "./address.constants";
import { TAddressInput } from "./address.interface";
import { AddressModel } from "./address.model";

export const createAddressService = async (userId: string, addressData: TAddressInput) => {
    const payload: TAddressInput = {
        ...addressData,
        label: addressData.label ?? DEFAULT_ADDRESS_LABEL,
    };
    // If this is the first address or isDefault is true, make it the default
    const existingAddresses = await AddressModel.find({ userId });
    if (existingAddresses.length === 0) {
        payload.isDefault = true;
    }

    // If isDefault is true, unset other addresses as default
    if (payload.isDefault) {
        await AddressModel.updateMany({ userId }, { isDefault: false });
    }

    const address = await AddressModel.create({ userId, ...payload });
    return address;
};

export const getAddressesByUserService = async (userId: string) => {
    const addresses = await AddressModel.find({ userId }).sort({ isDefault: -1 });
    return addresses;
};

export const getAddressByIdService = async (addressId: string, userId: string) => {
    const address = await AddressModel.findById(addressId);
    if (!address || address.userId.toString() !== userId) {
        throw new AppError(404, "Address not found");
    }
    return address;
};

export const updateAddressService = async (
    addressId: string,
    userId: string,
    updateData: Partial<TAddressInput>
) => {
    const address = await AddressModel.findById(addressId);
    if (!address || address.userId.toString() !== userId) {
        throw new AppError(404, "Address not found");
    }

    // If setting as default, unset other addresses
    if (updateData.isDefault) {
        await AddressModel.updateMany({ userId }, { isDefault: false });
    }

    Object.assign(address, updateData);
    await address.save();

    return address;
};

export const deleteAddressService = async (addressId: string, userId: string) => {
    const address = await AddressModel.findById(addressId);
    if (!address || address.userId.toString() !== userId) {
        throw new AppError(404, "Address not found");
    }

    // If this was the default, set another as default
    if (address.isDefault) {
        const nextAddress = await AddressModel.findOne({ userId, _id: { $ne: addressId } });
        if (nextAddress) {
            nextAddress.isDefault = true;
            await nextAddress.save();
        }
    }

    await AddressModel.findByIdAndDelete(addressId);
    return address;
};

export const setDefaultAddressService = async (addressId: string, userId: string) => {
    const address = await AddressModel.findById(addressId);
    if (!address || address.userId.toString() !== userId) {
        throw new AppError(404, "Address not found");
    }

    // Unset other addresses as default
    await AddressModel.updateMany({ userId }, { isDefault: false });

    // Set this as default
    address.isDefault = true;
    await address.save();

    return address;
};

export const addressService = {
    createAddressService,
    getAddressesByUserService,
    getAddressByIdService,
    updateAddressService,
    deleteAddressService,
    setDefaultAddressService,
};
