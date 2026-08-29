import { ClientSession, FilterQuery } from "mongoose";
import QueryBuilder from "../../builder/QueryBuilder";
import { USER_ROLE } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import { DEFAULT_ADDRESS_LABEL } from "../address/address.constants";
import { AddressModel } from "../address/address.model";
import { CartModel } from "../cart/cart.model";
import { CouponModel } from "../coupon/coupon.model";
import { getActiveCategoryOrderSettingsService } from "../order-settings/order-settings.service";
import { TOrderSettings } from "../order-settings/order-settings.interface";
import { OrderSettingsModel } from "../order-settings/order-settings.model";
import { calculateOrderCharges } from "../order-settings/order-settings.utils";
import { assertProductPurchasable } from "../products/product-availability.util";
import {
    applyOrderInventory,
    assertSufficientStock,
    revertOrderInventory,
} from "../products/product-inventory.util";
import { ProductModel } from "../products/products.model";
import {
    getDiscountedUnitPrice,
    getLineTotal,
    getProductLineDiscount,
    roundMoney,
} from "../products/product-price.util";
import { TransactionModel } from "../transaction/transaction.model";
import { formatOrdersForAdminResponse, formatOrdersForUserResponse } from "./order-admin-list.util";
import {
    notifyOrderCancelled,
    notifyOrderDelivered,
    toOrderDeliveredNotifyPayload,
} from "./order-delivered-notification.util";
import { getMonthUtcRange } from "./order-period.util";
import { parseOrderStatusQuery } from "./order-status.util";
import { TOrder } from "./order.interface";
import {
    ORDER_ADMIN_POPULATES,
    ORDER_INITIAL_PAYMENT_STATUS,
    ORDER_ITEMS_PRODUCT_POPULATE,
    ORDER_STATUSES,
    TOrderPaymentStatus,
} from "./order.constants";
import { resolveOrderPayment } from "./order-payment.util";
import { OrderModel } from "./order.model";

type TProductForOrderLine = {
    _id: { toString(): string };
    name: string;
    price: number;
    discount?: number;
    isAvailable?: boolean;
    categoryIds?: unknown[];
    categoryId?: unknown;
};

type TPricedOrderLine = {
    product: TProductForOrderLine;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

const buildPricedLines = (
    lines: { product: TProductForOrderLine; quantity: number }[]
): TPricedOrderLine[] =>
    lines.map(({ product, quantity }) => {
        const unitPrice = getDiscountedUnitPrice(product.price, product.discount ?? 0);
        const lineTotal = getLineTotal(unitPrice, quantity);
        return { product, quantity, unitPrice, lineTotal };
    });

const resolveCategoryShippingCost = async (
    pricedLines: TPricedOrderLine[],
    subtotal: number,
    pricingSettings: TOrderSettings,
    session?: ClientSession
) => {
    if (!pricingSettings) {
        throw new AppError(500, "No active default order pricing settings configured");
    }

    const categorySettings = await getActiveCategoryOrderSettingsService(session);
    const defaultCharge = pricingSettings.shipping.shippingFlatAmount;

    const categoryCharges = pricedLines.flatMap(({ product }) => {
        const productCategoryIds = new Set(
            [
                ...(product.categoryIds ?? []),
                ...(product.categoryId != null ? [product.categoryId] : []),
            ].map((categoryId) => String(categoryId))
        );
        return categorySettings
            .filter((setting) =>
                (setting.shipping.categoryIds ?? []).some((categoryId) =>
                    productCategoryIds.has(String(categoryId))
                )
            )
            .map((setting) => setting.shipping.shippingFlatAmount);
    });

    const maxCategoryShippingCost =
        categoryCharges.length > 0 ? Math.max(...categoryCharges) : null;

    const freeDeliveryApplied =
        pricingSettings.shipping.shippingType === "free" ||
        (pricingSettings.shipping.shippingType === "free_above_threshold" &&
            subtotal >= (pricingSettings.shipping.freeShippingMinSubtotal ?? 0));
    const shippingCost = freeDeliveryApplied
        ? 0
        : Math.max(maxCategoryShippingCost ?? defaultCharge, defaultCharge);

    return {
        shippingCost: roundMoney(shippingCost),
        maxCategoryShippingCost:
            maxCategoryShippingCost === null ? null : roundMoney(maxCategoryShippingCost),
        freeDeliveryApplied,
    };
};

const getActiveDefaultOrderSettings = async (session?: ClientSession) => {
    const query = OrderSettingsModel.findOne({
        isActive: true,
        $or: [{ isDefault: true }, { isDefault: { $exists: false } }],
    })
        .sort({ isDefault: -1 });

    if (session) query.session(session);
    return query;
};

const calculateCouponDiscount = async (subtotal: number, discountCode?: string) => {
    if (!discountCode) return 0;

    const coupon = await CouponModel.findOne({
        code: discountCode.toUpperCase(),
        isActive: true,
    });
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

    const calculatedDiscount =
        coupon.discountType === "percentage"
            ? (subtotal * coupon.discountValue) / 100
            : coupon.discountValue;

    return roundMoney(Math.min(Math.max(calculatedDiscount, 0), subtotal));
};

const getSelectedCartPricedLines = async (
    userId: string,
    selectedProductIds: string[]
) => {
    const cart = await CartModel.findOne({ userId }).populate({
        path: "items.productId",
        match: { isAvailable: true },
    });

    if (!cart || cart.items.length === 0) {
        throw new AppError(400, "Cart is empty");
    }

    const selectedIdSet = new Set(selectedProductIds);
    const selectedItems = cart.items.filter((item) => {
        const productId = resolveCartItemProductId(item);
        return productId != null && selectedIdSet.has(productId);
    });

    if (selectedItems.length !== selectedIdSet.size) {
        throw new AppError(400, "One or more selected products are not in your cart");
    }
    if (selectedItems.some((item) => typeof item.productId !== "object" || item.productId == null)) {
        throw new AppError(
            400,
            "One or more selected products are no longer available"
        );
    }

    return buildPricedLines(
        selectedItems.map((item) => ({
            product: item.productId as unknown as TProductForOrderLine,
            quantity: item.quantity,
        }))
    );
};

const getBuyNowPricedLines = async (productId: string, quantity: number) => {
    const product = await ProductModel.findById(productId);
    assertProductPurchasable(product);

    if ((product.available ?? 0) < quantity) {
        throw new AppError(400, "Insufficient stock available");
    }

    return buildPricedLines([{ product, quantity }]);
};

export type TOrderQuoteInput =
    | {
          mode: "cart";
          selectedProductIds: string[];
          couponCode?: string;
          discountCode?: string;
      }
    | {
          mode: "buy_now";
          productId: string;
          quantity: number;
          couponCode?: string;
          discountCode?: string;
      };

export const calculateOrderQuoteService = async (
    userId: string,
    input: TOrderQuoteInput
) => {
    const couponCode = (input.couponCode ?? input.discountCode)?.trim().toUpperCase();
    const pricedLines =
        input.mode === "cart"
            ? await getSelectedCartPricedLines(userId, input.selectedProductIds)
            : await getBuyNowPricedLines(input.productId, input.quantity);

    const subtotal = pricedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const productDiscount = roundMoney(
        pricedLines.reduce(
            (sum, { product, quantity }) =>
                sum + getProductLineDiscount(product.price, product.discount ?? 0, quantity),
            0
        )
    );
    const couponDiscount = await calculateCouponDiscount(subtotal, couponCode);
    const pricingSettings = await getActiveDefaultOrderSettings();

    if (!pricingSettings) {
        throw new AppError(500, "No active default order pricing settings configured");
    }

    const { tax } = calculateOrderCharges(subtotal, pricingSettings);
    const shippingQuote = await resolveCategoryShippingCost(
        pricedLines,
        subtotal,
        pricingSettings
    );
    const total = Math.max(
        0,
        roundMoney(subtotal + tax + shippingQuote.shippingCost - couponDiscount)
    );

    return {
        items: pricedLines.map(({ product, quantity, unitPrice, lineTotal }) => ({
            productId: product._id,
            name: product.name,
            originalPrice: product.price,
            unitPrice,
            quantity,
            productDiscountAmount: getProductLineDiscount(
                product.price,
                product.discount ?? 0,
                quantity
            ),
            lineTotal,
        })),
        couponCode,
        subtotal: roundMoney(subtotal),
        productDiscount,
        couponDiscount,
        couponDiscountAmount: couponDiscount,
        tax,
        shippingCost: shippingQuote.shippingCost,
        total,
        freeDeliveryApplied: shippingQuote.freeDeliveryApplied,
        shippingDetails: {
            shippingType: pricingSettings.shipping.shippingType,
            defaultShippingCost: pricingSettings.shipping.shippingFlatAmount,
            maxCategoryShippingCost: shippingQuote.maxCategoryShippingCost,
            freeShippingMinSubtotal:
                pricingSettings.shipping.shippingType === "free_above_threshold"
                    ? pricingSettings.shipping.freeShippingMinSubtotal ?? null
                    : null,
            freeDeliveryApplied: shippingQuote.freeDeliveryApplied,
        },
    };
};

const getAddressSnapshotForOrder = async (
    userId: string,
    shippingAddressId: string,
    session: ClientSession
) => {
    const shippingAddress = await AddressModel.findById(shippingAddressId).session(session);
    if (!shippingAddress || shippingAddress.userId.toString() !== userId) {
        throw new AppError(400, "Invalid shipping address");
    }

    const phoneNumber = shippingAddress.phoneNumber?.trim();
    if (!phoneNumber) {
        throw new AppError(400, "Shipping address must include a phone number");
    }

    return {
        street: shippingAddress.street,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phoneNumber,
        label: shippingAddress.label ?? DEFAULT_ADDRESS_LABEL,
    };
};

const commitOrderFromPricedLines = async (
    userId: string,
    shippingAddressId: string,
    pricedLines: TPricedOrderLine[],
    options: {
        discountCode?: string;
        paymentMethod?: string;
        transactionId?: string;
        notes?: string;
        /** Product IDs to remove from cart after order (checkout selected lines only). */
        removeProductIdsFromCart?: string[];
    }
) => {
    if (!options.paymentMethod?.trim()) {
        throw new AppError(400, "Payment method is required");
    }

    const resolvedPayment = await resolveOrderPayment(
        options.paymentMethod,
        options.transactionId
    );

    if (pricedLines.length === 0) {
        throw new AppError(400, "No products to order");
    }

    const unavailableProduct = pricedLines.some(({ product }) => product.isAvailable === false);
    if (unavailableProduct) {
        throw new AppError(400, "One or more products are not available");
    }

    const session = await OrderModel.startSession();
    session.startTransaction();

    try {
        const addressSnapshot = await getAddressSnapshotForOrder(
            userId,
            shippingAddressId,
            session
        );

        const subtotal = pricedLines.reduce((sum, line) => sum + line.lineTotal, 0);

        const productDiscountAmount = roundMoney(
            pricedLines.reduce(
                (sum, { product, quantity }) =>
                    sum +
                    getProductLineDiscount(product.price, product.discount ?? 0, quantity),
                0
            )
        );

        let couponDiscountAmount = 0;
        const couponCode = options.discountCode?.trim().toUpperCase();
        if (couponCode) {
            const coupon = await CouponModel.findOne({
                code: couponCode,
                isActive: true,
            }).session(session);
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

            const calculatedDiscount =
                coupon.discountType === "percentage"
                    ? (subtotal * coupon.discountValue) / 100
                    : coupon.discountValue;
            couponDiscountAmount = roundMoney(
                Math.min(Math.max(calculatedDiscount, 0), subtotal)
            );

            coupon.currentUses += 1;
            await coupon.save({ session });
        }

        // Product discounts are already reflected in subtotal. This field is
        // reserved for the coupon discount shown in order history.
        const discountAmount = couponDiscountAmount;

        const items = pricedLines.map(({ product, quantity, unitPrice, lineTotal }) => ({
            productId: product._id,
            name: product.name,
            originalPrice: product.price,
            price: unitPrice,
            quantity,
            total: lineTotal,
            productDiscountAmount: getProductLineDiscount(
                product.price,
                product.discount ?? 0,
                quantity
            ),
        }));

        const pricingSettings = await getActiveDefaultOrderSettings(session);
        if (!pricingSettings) {
            throw new AppError(500, "No active order pricing settings configured");
        }

        const { tax } = calculateOrderCharges(subtotal, pricingSettings);
        const shippingQuote = await resolveCategoryShippingCost(
            pricedLines,
            subtotal,
            pricingSettings,
            session
        );
        const shippingCost = shippingQuote.shippingCost;
        const total = Math.max(0, roundMoney(subtotal + tax + shippingCost - couponDiscountAmount));

        const orderData = {
            orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
            userId,
            items,
            shippingAddress: addressSnapshot,
            billingAddress: addressSnapshot,
            tax,
            shippingCost,
            subtotal,
            couponCode,
            // Keep the old field populated for clients using discountCode.
            discountCode: couponCode,
            productDiscountAmount,
            couponDiscountAmount,
            discountAmount,
            total,
            paymentMethod: resolvedPayment.paymentMethod,
            transactionId: resolvedPayment.transactionId,
            orderStatus: "pending" as const,
            paymentStatus: ORDER_INITIAL_PAYMENT_STATUS,
            ...(options.notes?.trim() && { notes: options.notes.trim() }),
        };

        await assertSufficientStock(items, session);

        const [order] = await OrderModel.create([orderData], { session });

        await applyOrderInventory(items, session);

        if (options.removeProductIdsFromCart?.length) {
            await removeOrderedProductsFromCart(userId, options.removeProductIdsFromCart, session);
        }

        await session.commitTransaction();
        return order;
    } catch (error) {
        await session.abortTransaction();
        console.error("Order creation failed, transaction rolled back:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

/** Remove only ordered product lines from the user's cart (keeps unselected items). */
const removeOrderedProductsFromCart = async (
    userId: string,
    productIdsToRemove: string[],
    session: ClientSession
) => {
    const cart = await CartModel.findOne({ userId }).session(session);
    if (!cart) {
        return;
    }

    const removeSet = new Set(productIdsToRemove.map((id) => String(id)));
    cart.items = cart.items.filter((item) => {
        const productId = resolveCartItemProductId(item);
        return productId == null || !removeSet.has(productId);
    }) as typeof cart.items;

    if (cart.items.length === 0) {
        await CartModel.deleteOne({ userId }, { session });
        return;
    }

    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.total = cart.subtotal;
    await cart.save({ session });
};

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
 * @param notes Optional delivery/order notes
 * @returns Order
 */
export const createOrderService = async (
    userId: string,
    shippingAddressId: string,
    selectedProductIds: string[],
    discountCode?: string,
    paymentMethod?: string,
    transactionId?: string,
    notes?: string
) => {
    const cart = await CartModel.findOne({ userId }).populate({
        path: "items.productId",
        match: { isAvailable: true },
    });

    if (!cart || cart.items.length === 0) {
        throw new AppError(400, "Cart is empty");
    }

    const validCartItems = cart.items.filter((item) => resolveCartItemProductId(item) !== null);
    if (validCartItems.length < cart.items.length) {
        cart.items = validCartItems as typeof cart.items;
        cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
        cart.total = cart.subtotal;
        await cart.save();
    }

    if (cart.items.length === 0) {
        throw new AppError(400, "Cart is empty");
    }

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

    const pricedLines = buildPricedLines(
        selectedItems.map((item) => ({
            product: item.productId as unknown as TProductForOrderLine,
            quantity: item.quantity,
        }))
    );

    const orderedProductIds = selectedItems
        .map((item) => resolveCartItemProductId(item))
        .filter((id): id is string => Boolean(id));

    return commitOrderFromPricedLines(userId, shippingAddressId, pricedLines, {
        discountCode,
        paymentMethod,
        transactionId,
        notes,
        removeProductIdsFromCart: orderedProductIds,
    });
};

/**
 * Buy now — place order for a single product without adding to cart first.
 */
export const buyNowOrderService = async (
    userId: string,
    productId: string,
    quantity: number,
    shippingAddressId: string,
    discountCode?: string,
    paymentMethod?: string,
    transactionId?: string,
    notes?: string
) => {
    const product = await ProductModel.findById(productId);
    assertProductPurchasable(product);

    const stock = product.available ?? 0;
    if (stock < quantity) {
        throw new AppError(400, "Insufficient stock available");
    }

    const pricedLines = buildPricedLines([{ product, quantity }]);

    return commitOrderFromPricedLines(userId, shippingAddressId, pricedLines, {
        discountCode,
        paymentMethod,
        transactionId,
        notes,
    });
};

/**
 * Get order by ID (By User)
 * @param orderId Order ID
 * @returns Order
 */
export const getOrderByIdService = async (orderId: string, role: string, userId: string) => {
    if (role === USER_ROLE.USER) {
        const order = await OrderModel.findOne({ orderId, userId })
            .populate(ORDER_ITEMS_PRODUCT_POPULATE)
            .lean();
        if (!order) {
            throw new AppError(404, "Order not found");
        }
        const [formatted] = await formatOrdersForUserResponse([order]);
        return formatted;
    }
    const order = await OrderModel.findOne({ orderId }).populate(ORDER_ADMIN_POPULATES).lean();
    if (!order) {
        throw new AppError(404, "Order not found");
    }
    const [formatted] = await formatOrdersForAdminResponse([order]);
    return formatted;
};

/**
 * Get orders by user (By User)
 * @param userId User ID
 * @returns Orders
 */
export const getOrdersByUserService = async (userId: string, query: Record<string, unknown>) => {
    const orderQuery = new QueryBuilder(
        OrderModel.find({ userId }).populate(ORDER_ITEMS_PRODUCT_POPULATE),
        query
    )
        .search([])
        .filter()
        .sort()
        .paginate()
        .fields();
    const orders = await formatOrdersForUserResponse(
        (await orderQuery.modelQuery.populate(ORDER_ITEMS_PRODUCT_POPULATE).lean()) as {
            items?: Array<{ productId?: unknown }>;
        }[]
    );
    const meta = await orderQuery.countTotal();
    return { orders, meta };
};

/**
 * Get all orders (By Admin)
 * @returns Orders
 */
export const getAllOrdersService = async (query: Record<string, unknown>) => {
    const orderQuery = new QueryBuilder(OrderModel.find().populate(ORDER_ADMIN_POPULATES), query)
        .search([])
        .filter()
        .sort()
        .paginate()
        .fields();
    const orders = await orderQuery.modelQuery.populate(ORDER_ADMIN_POPULATES).lean();
    const formattedOrders = await formatOrdersForAdminResponse(
        orders as { items?: Array<{ productId?: unknown }>; userId?: unknown }[]
    );
    const meta = await orderQuery.countTotal();
    return { orders: formattedOrders, meta };
};

export type TGetOrdersByPeriodParams = {
    month: number;
    year: number;
    orderStatus?: string;
    sort?: string;
    fields?: string;
};

/**
 * List orders for a calendar month (UTC), optional multi-status filter. Admin panel only.
 */
export const getOrdersByPeriodService = async (params: TGetOrdersByPeriodParams) => {
    const { start, end } = getMonthUtcRange(params.year, params.month);
    const statuses = parseOrderStatusQuery(params.orderStatus);

    const filter: FilterQuery<TOrder> = {
        createdAt: { $gte: start, $lt: end },
    };

    if (statuses?.length === 1) {
        filter.orderStatus = statuses[0];
    } else if (statuses && statuses.length > 1) {
        filter.orderStatus = { $in: statuses };
    }

    const listQuery: Record<string, unknown> = {
        sort: params.sort ?? "-createdAt",
    };

    if (params.fields) {
        listQuery.fields = params.fields;
    }

    const orderQuery = new QueryBuilder(OrderModel.find(filter).populate(ORDER_ADMIN_POPULATES), listQuery)
        .search([])
        .sort()
        .fields();

    const orderDetails = await formatOrdersForAdminResponse(
        (await orderQuery.modelQuery.populate(ORDER_ADMIN_POPULATES).lean()) as {
            items?: Array<{ productId?: unknown }>;
            userId?: unknown;
        }[]
    );
    const totalDocuments = await OrderModel.countDocuments(filter);

    return {
        orderDetails,
        meta: { totalDocuments },
        period: {
            month: params.month,
            year: params.year,
            from: start.toISOString(),
            to: end.toISOString(),
            orderStatuses: statuses ?? null,
        },
    };
};

/**
 * Update order status (By Admin)
 * @param orderId Order ID
 * @param status Status
 * @returns Order
 */
export const updateOrderStatusService = async (orderId: string, status: string) => {
    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
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

        if (status === "delivered" && oldStatus !== "delivered") {
            const notifyPayload = toOrderDeliveredNotifyPayload(
                typeof order.toObject === "function" ? order.toObject() : order
            );
            void notifyOrderDelivered(notifyPayload);
        }
        if (status === "cancelled" && oldStatus !== "cancelled") {
            const notifyPayload = toOrderDeliveredNotifyPayload(
                typeof order.toObject === "function" ? order.toObject() : order
            );
            void notifyOrderCancelled(notifyPayload);
        }

        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Update order payment status (By Admin)
 * Syncs linked transaction status when a transaction exists for the order.
 */
export const updateOrderPaymentStatusService = async (
    orderId: string,
    paymentStatus: TOrderPaymentStatus
) => {
    const order = await OrderModel.findOneAndUpdate(
        { orderId },
        { paymentStatus },
        { new: true, runValidators: true }
    );

    if (!order) {
        throw new AppError(404, "Order not found");
    }

    const transactionStatusByPayment: Record<
        TOrderPaymentStatus,
        "pending" | "completed" | "failed"
    > = {
        pending: "pending",
        completed: "completed",
        failed: "failed",
    };

    await TransactionModel.updateOne(
        { orderId },
        { transactionStatus: transactionStatusByPayment[paymentStatus] }
    );

    return order;
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
        const notifyPayload = toOrderDeliveredNotifyPayload(
            typeof order.toObject === "function" ? order.toObject() : order
        );
        void notifyOrderCancelled(notifyPayload);
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
    buyNowOrderService,
    getOrderByIdService,
    getOrdersByUserService,
    getAllOrdersService,
    getOrdersByPeriodService,
    updateOrderStatusService,
    updateOrderPaymentStatusService,
    cancelOrderService,
};
