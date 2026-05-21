import QueryBuilder from "../../builder/QueryBuilder";
import { USER_ROLE } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import { AddressModel } from "../address/address.model";
import { CartModel } from "../cart/cart.model";
import { CouponModel } from "../coupon/coupon.model";
import {
    applyOrderInventory,
    assertSufficientStock,
    revertOrderInventory,
} from "../products/product-inventory.util";
import { OrderModel } from "./order.model";

/** Resolve product id from a cart line (populated object, raw string, or missing). */
const resolveCartItemProductId = (item: { productId?: unknown }): string | null => {
    const pid = item?.productId;
    if (pid == null) return null;
    if (typeof pid === "string") return pid;
    if (typeof pid === "object" && pid !== null && "_id" in pid) {
        return String((pid as { _id: unknown })._id);
    }
    return null;
};

/**
 * Create order (By User)
 * @param userId User ID
 * @param shippingAddressId Shipping address ID
 * @param selectedProductIds Array of product IDs to order
 * @param discountCode Discount code
 * @param paymentMethod Payment method
 * @param transactionId Transaction ID (required for non-cash payments)
 * @returns Order
 */
export const createOrderService = async (
    userId: string,
    shippingAddressId: string,
    selectedProductIds: string[],
    discountCode?: string,
    paymentMethod?: string,
    transactionId?: string
) => {
    // Validate transaction ID requirement for non-cash payments
    const cashOnDeliveryVariants = ["cash", "cod", "cash on delivery", "cash_on_delivery"];
    const isCashOnDelivery = !paymentMethod || cashOnDeliveryVariants.includes(paymentMethod.toLowerCase());

    if (!isCashOnDelivery && !transactionId) {
        throw new AppError(400, "Transaction ID is required for non-cash on delivery payments");
    }

    // Start MongoDB session for transaction
    const session = await OrderModel.startSession();
    session.startTransaction();

    try {
        const cart = await CartModel.findOne({ userId }).populate("items.productId").session(session);
        if (!cart || cart.items.length === 0) {
            throw new AppError(400, "Cart is empty");
        }

        // Drop cart lines whose product was deleted (populate leaves productId null)
        const validCartItems = cart.items.filter((item) => resolveCartItemProductId(item) !== null);
        if (validCartItems.length < cart.items.length) {
            cart.items = validCartItems as typeof cart.items;
            cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
            cart.total = cart.subtotal;
            await cart.save({ session });
        }

        if (cart.items.length === 0) {
            throw new AppError(400, "Cart is empty");
        }

        const shippingAddress = await AddressModel.findById(shippingAddressId).session(session);
        if (!shippingAddress || shippingAddress.userId.toString() !== userId) {
            throw new AppError(400, "Invalid shipping address");
        }

        // Filter cart items to only include selected products
        const selectedItems = cart.items.filter((item) => {
            const productId = resolveCartItemProductId(item);
            return productId != null && selectedProductIds.includes(productId);
        });

        if (selectedItems.length === 0) {
            throw new AppError(400, "No valid products selected for order");
        }

        const missingProduct = selectedItems.some(
            (item) => typeof item.productId !== "object" || item.productId == null
        );
        if (missingProduct) {
            throw new AppError(
                400,
                "One or more products in your cart are no longer available. Please remove them and try again."
            );
        }

        // Calculate subtotal from selected items only
        const subtotal = selectedItems.reduce((sum: number, item: any) => sum + item.total, 0);

        let discountAmount = 0;
        if (discountCode) {
            const coupon = await CouponModel.findOne({ code: discountCode.toUpperCase() }).session(session);
            if (!coupon) {
                throw new AppError(400, "Invalid discount code");
            }

            const now = new Date();
            if (coupon.validFrom > now || coupon.validUntil < now) {
                throw new AppError(400, "Discount code has expired");
            }

            if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
                throw new AppError(400, "Discount code usage limit reached");
            }

            if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
                throw new AppError(400, `Minimum order amount of ${coupon.minOrderAmount} required`);
            }

            if (coupon.discountType === "percentage") {
                discountAmount = (subtotal * coupon.discountValue) / 100;
            } else {
                discountAmount = coupon.discountValue;
            }

            coupon.currentUses += 1;
            await coupon.save({ session });
        }

        // Snapshot selected cart items
        const items = selectedItems.map((item: any) => ({
            productId: item.productId._id,
            name: item.productId.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
        }));

        const tax = subtotal * 0.05; // 5% tax
        const shippingCost = subtotal > 5000 ? 0 : 100; // Free shipping over 5000
        const total = subtotal + tax + shippingCost - discountAmount;

        // Create order with transaction session
        const orderData = {
            orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
            userId,
            items,
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                postalCode: shippingAddress.postalCode,
                country: shippingAddress.country,
            },
            billingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                postalCode: shippingAddress.postalCode,
                country: shippingAddress.country,
            },
            tax,
            shippingCost,
            subtotal,
            discountCode: discountCode?.toUpperCase(),
            discountAmount,
            total,
            paymentMethod: paymentMethod || "cash",
            transactionId: transactionId || undefined,
            orderStatus: "pending",
            paymentStatus: isCashOnDelivery ? "pending" : "completed",
        };

        await assertSufficientStock(items, session);

        const [order] = await OrderModel.create([orderData], { session });

        await applyOrderInventory(items, session);

        // Clear cart after successful order creation
        await CartModel.deleteOne({ userId }, { session });

        // Commit the transaction
        await session.commitTransaction();

        return order;
    } catch (error) {
        // Rollback transaction on any error
        await session.abortTransaction();
        console.error("Order creation failed, transaction rolled back:", error);
        throw error;
    } finally {
        // End session
        session.endSession();
    }
};

/**
 * Get order by ID (By User)
 * @param orderId Order ID
 * @returns Order
 */
export const getOrderByIdService = async (orderId: string, role: string, userId: string) => {
    if (role === USER_ROLE.USER) {
        const order = await OrderModel.findOne({ orderId, userId });
        if (!order) {
            throw new AppError(404, "Order not found");
        }
        return order;
    }
    const order = await OrderModel.findOne({ orderId });
    if (!order) {
        throw new AppError(404, "Order not found");
    }
    return order;
};

/**
 * Get orders by user (By User)
 * @param userId User ID
 * @returns Orders
 */
export const getOrdersByUserService = async (userId: string, query: Record<string, unknown>) => {
    const orderQuery = new QueryBuilder(OrderModel.find({ userId }), query).search([]).filter().sort().paginate().fields();
    const orders = await orderQuery.modelQuery;
    const meta = await orderQuery.countTotal();
    return { orders, meta };
};

/**
 * Get all orders (By Admin)
 * @returns Orders
 */
export const getAllOrdersService = async (query: Record<string, unknown>) => {
    const orderQuery = new QueryBuilder(OrderModel.find(), query).search([]).filter().sort().paginate().fields();
    const orders = await orderQuery.modelQuery;
    const meta = await orderQuery.countTotal();
    return { orders, meta };
};

/**
 * Update order status (By Admin)
 * @param orderId Order ID
 * @param status Status
 * @returns Order
 */
export const updateOrderStatusService = async (orderId: string, status: string) => {
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
        throw new AppError(400, "Invalid status");
    }

    const session = await OrderModel.startSession();
    session.startTransaction();

    try {
        const order = await OrderModel.findOne({ orderId }).session(session);
        if (!order) {
            throw new AppError(404, "Order not found");
        }

        const oldStatus = order.orderStatus;

        if (oldStatus !== "cancelled" && status === "cancelled") {
            await revertOrderInventory(order.items, session);
        }

        if (oldStatus === "cancelled" && status !== "cancelled") {
            await assertSufficientStock(order.items, session);
            await applyOrderInventory(order.items, session);
        }

        order.orderStatus = status as typeof order.orderStatus;
        order.updatedAt = new Date();
        await order.save({ session });

        await session.commitTransaction();
        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Cancel order (By User)
 * @param orderId Order ID
 * @param userId User ID
 * @returns Order
 */
export const cancelOrderService = async (orderId: string, userId: string) => {
    const session = await OrderModel.startSession();
    session.startTransaction();

    try {
        const order = await OrderModel.findOne({ orderId, userId }).session(session);

        if (!order) {
            throw new AppError(404, "Order not found");
        }

        if (order.orderStatus === "cancelled") {
            throw new AppError(400, "Order is already cancelled");
        }

        if (order.orderStatus === "delivered") {
            throw new AppError(400, "Cannot cancel a delivered order");
        }

        const timeDifferenceInHours =
            (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);

        if (timeDifferenceInHours > 6) {
            throw new AppError(400, "Order can only be cancelled within 6 hours of creation");
        }

        await revertOrderInventory(order.items, session);

        order.orderStatus = "cancelled";
        order.updatedAt = new Date();
        await order.save({ session });

        await session.commitTransaction();
        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const orderService = {
    createOrderService,
    getOrderByIdService,
    getOrdersByUserService,
    getAllOrdersService,
    updateOrderStatusService,
    cancelOrderService,
};
