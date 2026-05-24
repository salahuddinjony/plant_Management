import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
    buyNowOrderService,
    cancelOrderService,
    createOrderService,
    getAllOrdersService,
    getOrdersByPeriodService,
    getOrderByIdService,
    getOrdersByUserService,
    updateOrderPaymentStatusService,
    updateOrderStatusService,
} from "./order.service";

/**
 * Create order (By User)
 * @param req Request
 * @param res Response
 */
export const buyNowOrder = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
        productId,
        quantity,
        shippingAddressId,
        discountCode,
        paymentMethod,
        transactionId,
        notes,
    } = req.body;

    const order = await buyNowOrderService(
        userId,
        productId,
        quantity,
        shippingAddressId,
        discountCode,
        paymentMethod,
        transactionId,
        notes
    );

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Order placed successfully",
        data: order,
    });
});

export const createOrder = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { shippingAddressId, selectedProductIds, discountCode, paymentMethod, transactionId, notes } =
        req.body;

    const order = await createOrderService(
        userId,
        shippingAddressId,
        selectedProductIds,
        discountCode,
        paymentMethod,
        transactionId,
        notes
    );

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Order created successfully",
        data: order,
    });
});

/**
 * Get order by ID (By User)
 * @param req Request
 * @param res Response
 */
export const getOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string };
    const role = req.user?.role;
    const userId = req.user?.id;

    const order = await getOrderByIdService(orderId as string, role as string, userId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Order retrieved successfully",
        data: order,
    });
});

/**
 * Get orders by user (By User)
 * @param req Request
 * @param res Response
 */
export const getOrders = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const query = req.query;

    const orders = await getOrdersByUserService(userId as string, query);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: orders,
    });
});

/**
 * Get all orders (By Admin)
 * @param req Request
 * @param res Response
 */
export const getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const query = req.query;
    const orders = await getAllOrdersService(query);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: orders,
    });
});

/**
 * Get orders for a month/year with optional multi-status filter (admin panel only).
 */
export const getOrdersByPeriod = catchAsync(async (req: Request, res: Response) => {
    const { month, year, orderStatus, sort, fields } = req.query;

    const result = await getOrdersByPeriodService({
        month: Number(month),
        year: Number(year),
        orderStatus: orderStatus as string | undefined,
        sort: sort as string | undefined,
        fields: fields as string | undefined,
    });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: result,
    });
});

/**
 * Update order status (By Admin)
 * @param req Request
 * @param res Response
 */
export const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string };
    const { status } = req.body;

    const order = await updateOrderStatusService(orderId as string, status as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Order status updated successfully",
        data: order,
    });
});

/**
 * Update order payment status (By Admin)
 */
export const updateOrderPaymentStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string };
    const { paymentStatus } = req.body;

    const order = await updateOrderPaymentStatusService(
        orderId as string,
        paymentStatus
    );

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Order payment status updated successfully",
        data: order,
    });
});

/**
 * Cancel order (By User)
 * @param req Request
 * @param res Response
 */
export const cancelOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string };
    const userId = req.user?.id;

    const order = await cancelOrderService(orderId as string, userId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Order cancelled successfully",
        data: order,
    });
});

export const orderController = {
    buyNowOrder,
    createOrder,
    getOrder,
    getOrders,
    getAllOrders,
    getOrdersByPeriod,
    updateOrderStatus,
    updateOrderPaymentStatus,
    cancelOrder,
};
