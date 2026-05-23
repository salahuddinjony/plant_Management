import AppError from "../../errors/AppError";
import { PaymentMethodModel } from "../payment-method/payment-method.model";

/** Stored value for cash-on-delivery orders */
export const COD_PAYMENT_METHOD = "COD";

const COD_ALIASES = new Set([
    "cash",
    "cod",
    "cash on delivery",
    "cash_on_delivery",
    "cashondelivery",
]);

export const isCodPayment = (paymentMethod: string): boolean =>
    COD_ALIASES.has(paymentMethod.trim().toLowerCase());

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Resolve payment fields for a new order.
 * - COD → paymentMethod "COD", no transactionId, always pending until admin confirms
 * - Online → active payment method from DB + required transactionId
 */
export const resolveOrderPayment = async (
    paymentMethod: string,
    transactionId?: string
): Promise<{ paymentMethod: string; transactionId?: string }> => {
    const raw = paymentMethod?.trim();
    if (!raw) {
        throw new AppError(400, "Payment method is required");
    }

    if (isCodPayment(raw)) {
        if (transactionId?.trim()) {
            throw new AppError(400, "Transaction ID is not used for COD orders");
        }
        return { paymentMethod: COD_PAYMENT_METHOD };
    }

    const txn = transactionId?.trim();
    if (!txn) {
        throw new AppError(400, "Transaction ID is required for online payment");
    }

    const activeMethod = await PaymentMethodModel.findOne({
        methodName: { $regex: new RegExp(`^${escapeRegex(raw)}$`, "i") },
        isActive: true,
    });

    if (!activeMethod) {
        throw new AppError(
            400,
            `Payment method "${raw}" is not available. Choose an active method from checkout.`
        );
    }

    return {
        paymentMethod: activeMethod.methodName,
        transactionId: txn,
    };
};
