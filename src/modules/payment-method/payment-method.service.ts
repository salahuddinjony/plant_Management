import AppError from "../../errors/AppError";
import { TPaymentMethod } from "./payment-method.interface";
import { PaymentMethodModel } from "./payment-method.model";
import { assertBankBranchName } from "./payment-method.util";

export const createPaymentMethodService = async (data: TPaymentMethod) => {
    assertBankBranchName(data.accountType, data.branchName);
    const result = await PaymentMethodModel.create(data);
    return result;
};

export const getPaymentMethodByIdService = async (id: string) => {
    const result = await PaymentMethodModel.findById(id);
    if (!result) {
        throw new AppError(404, "Payment method not found");
    }
    return result;
};

export const getAllPaymentMethodsService = async () => {
    const result = await PaymentMethodModel.find().sort({ displayOrder: 1, createdAt: -1 });
    return result;
};

/** Customer checkout — active methods only, sorted for display. */
export const getActivePaymentMethodsService = async () => {
    return PaymentMethodModel.find({ isActive: true })
        .sort({ displayOrder: 1, createdAt: 1 })
        .lean();
};

export const getPaymentMethodByIdActiveService = async (id: string) => {
    const result = await PaymentMethodModel.findOne({ _id: id, isActive: true }).lean();
    if (!result) {
        throw new AppError(404, "Payment method not found or not available");
    }
    return result;
};

export const updatePaymentMethodService = async (
    id: string,
    updateData: Partial<TPaymentMethod>
) => {
    const existing = await PaymentMethodModel.findById(id);
    if (!existing) {
        throw new AppError(404, "Payment method not found");
    }

    const accountType = updateData.accountType ?? existing.accountType;
    const branchName =
        updateData.branchName !== undefined ? updateData.branchName : existing.branchName;

    assertBankBranchName(accountType, branchName);

    const result = await PaymentMethodModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!result) {
        throw new AppError(404, "Payment method not found");
    }
    return result;
};

export const deletePaymentMethodService = async (id: string) => {
    const result = await PaymentMethodModel.findByIdAndDelete(id);
    if (!result) {
        throw new AppError(404, "Payment method not found");
    }
    return result;
};

export const paymentMethodService = {
    createPaymentMethodService,
    getPaymentMethodByIdService,
    getAllPaymentMethodsService,
    getActivePaymentMethodsService,
    getPaymentMethodByIdActiveService,
    updatePaymentMethodService,
    deletePaymentMethodService,
};
