import { getIdentifierChannel, toMimMobileNumber } from "../../utils/identifierChannel.util";
import { sendHtmlEmail } from "../../utils/emailService";
import { sendMimSms } from "../../utils/smsService";
import { UserModel } from "../users/users.model";

export type TOrderDeliveredNotifyOrder = {
    orderId: string;
    userId: string | { toString(): string };
    items: Array<{ name: string; quantity: number; total: number; price?: number }>;
    subtotal: number;
    tax: number;
    shippingCost: number;
    discountAmount?: number;
    total: number;
    paymentMethod?: string;
    paymentStatus: string;
    shippingAddress: {
        city: string;
        phoneNumber: string;
        street?: string;
        country?: string;
    };
    notes?: string;
    updatedAt?: Date;
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const formatMoney = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

const buildItemsRowsHtml = (items: TOrderDeliveredNotifyOrder["items"]) =>
    items
        .map(
            (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatMoney(item.total)}</td>
      </tr>`
        )
        .join("");

const buildOrderDeliveredEmailHtml = ({
    customerName,
    order,
}: {
    customerName: string;
    order: TOrderDeliveredNotifyOrder;
}) => {
    const deliveredAt = order.updatedAt
        ? new Date(order.updatedAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })
        : new Date().toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });

    const addressParts = [
        order.shippingAddress.street,
        order.shippingAddress.city,
        order.shippingAddress.country,
        `Phone: ${order.shippingAddress.phoneNumber}`,
    ].filter(Boolean);

    const discountRow =
        order.discountAmount && order.discountAmount > 0
            ? `<tr><td colspan="2" style="padding:4px 0;color:#666;">Discount</td><td style="text-align:right;color:#16a34a;">−${formatMoney(order.discountAmount)}</td></tr>`
            : "";

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order delivered</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:10px;padding:32px;">
      <h1 style="color:#166534;font-size:22px;margin:0 0 8px;">Your order has been delivered</h1>
      <p style="color:#666;margin:0 0 24px;">Nursery Bazar BD</p>
      <p>Hello ${escapeHtml(customerName)},</p>
      <p>Good news — your order <strong>${escapeHtml(order.orderId)}</strong> was marked as <strong>delivered</strong> on ${escapeHtml(deliveredAt)}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:8px;text-align:left;">Item</th>
            <th style="padding:8px;text-align:center;">Qty</th>
            <th style="padding:8px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${buildItemsRowsHtml(order.items)}</tbody>
      </table>
      <table style="width:100%;margin:8px 0 20px;">
        <tr><td colspan="2" style="padding:4px 0;color:#666;">Subtotal</td><td style="text-align:right;">${formatMoney(order.subtotal)}</td></tr>
        <tr><td colspan="2" style="padding:4px 0;color:#666;">Shipping</td><td style="text-align:right;">${formatMoney(order.shippingCost)}</td></tr>
        ${order.tax > 0 ? `<tr><td colspan="2" style="padding:4px 0;color:#666;">Tax</td><td style="text-align:right;">${formatMoney(order.tax)}</td></tr>` : ""}
        ${discountRow}
        <tr><td colspan="2" style="padding:8px 0;font-weight:bold;font-size:16px;">Order total</td><td style="text-align:right;font-weight:bold;font-size:16px;">${formatMoney(order.total)}</td></tr>
      </table>
      <p style="margin:0 0 8px;"><strong>Payment:</strong> ${escapeHtml(order.paymentMethod ?? "—")} (${escapeHtml(order.paymentStatus)})</p>
      <p style="margin:0 0 8px;"><strong>Deliver to:</strong> ${escapeHtml(addressParts.join(", "))}</p>
      ${order.notes?.trim() ? `<p style="margin:0;color:#666;"><strong>Notes:</strong> ${escapeHtml(order.notes.trim())}</p>` : ""}
      <p style="color:#999;font-size:12px;margin-top:28px;">Thank you for shopping with us.</p>
    </div>
  </div>
</body>
</html>`;
};

const buildOrderDeliveredSms = ({
    customerName,
    order,
}: {
    customerName: string;
    order: TOrderDeliveredNotifyOrder;
}) => {
    const itemSummary =
        order.items.length === 1
            ? `${order.items[0].name} x${order.items[0].quantity}`
            : `${order.items[0].name} x${order.items[0].quantity}${order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}`;

    return `Nursery Bazar: Hi ${customerName}, order ${order.orderId} is delivered. ${itemSummary}. Total ${formatMoney(order.total)}. Thank you!`;
};

const buildOrderDeliveredEmailText = ({
    customerName,
    order,
}: {
    customerName: string;
    order: TOrderDeliveredNotifyOrder;
}) => {
    const lines = order.items.map((i) => `- ${i.name} x${i.quantity}: ${formatMoney(i.total)}`);
    return [
        `Hello ${customerName},`,
        ``,
        `Your order ${order.orderId} has been delivered.`,
        ``,
        `Items:`,
        ...lines,
        ``,
        `Subtotal: ${formatMoney(order.subtotal)}`,
        `Shipping: ${formatMoney(order.shippingCost)}`,
        order.discountAmount ? `Discount: −${formatMoney(order.discountAmount)}` : "",
        `Total: ${formatMoney(order.total)}`,
        ``,
        `Deliver to: ${order.shippingAddress.city}, ${order.shippingAddress.phoneNumber}`,
        order.notes?.trim() ? `Notes: ${order.notes.trim()}` : "",
        ``,
        `Thank you for shopping with Nursery Bazar BD.`,
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendOrderDeliveredNotification = async ({
    order,
    customerName,
    emailOrPhone,
}: {
    order: TOrderDeliveredNotifyOrder;
    customerName: string;
    emailOrPhone: string;
}) => {
    const channel = getIdentifierChannel(emailOrPhone.trim());

    if (channel === "email") {
        await sendHtmlEmail({
            email: emailOrPhone.trim(),
            subject: `Your order ${order.orderId} has been delivered - Nursery Bazar BD`,
            html: buildOrderDeliveredEmailHtml({ customerName, order }),
            text: buildOrderDeliveredEmailText({ customerName, order }),
        });
        return { channel: "email" as const };
    }

    await sendMimSms(toMimMobileNumber(emailOrPhone), buildOrderDeliveredSms({ customerName, order }));
    return { channel: "sms" as const };
};

/** Load customer and notify when order becomes delivered (errors are logged, not thrown). */
export const notifyOrderDelivered = async (order: TOrderDeliveredNotifyOrder) => {
    const userId = String(order.userId);

    const user = await UserModel.findById(userId).select("name emailOrPhone").lean();
    if (!user) {
        console.warn(`[order-delivered] User not found for order ${order.orderId} (userId=${userId})`);
        return;
    }

    if (!user.emailOrPhone?.trim()) {
        console.warn(`[order-delivered] No contact for user ${userId}, order ${order.orderId}`);
        return;
    }

    try {
        const result = await sendOrderDeliveredNotification({
            order,
            customerName: user.name,
            emailOrPhone: user.emailOrPhone,
        });
        console.info(
            `[order-delivered] Notified ${result.channel} for order ${order.orderId} → ${user.emailOrPhone}`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[order-delivered] Failed for order ${order.orderId}:`, message);
    }
};

export const toOrderDeliveredNotifyPayload = (order: {
    orderId: string;
    userId: unknown;
    items: TOrderDeliveredNotifyOrder["items"];
    subtotal: number;
    tax: number;
    shippingCost: number;
    discountAmount?: number;
    total: number;
    paymentMethod?: string;
    paymentStatus: string;
    shippingAddress: TOrderDeliveredNotifyOrder["shippingAddress"];
    notes?: string;
    updatedAt?: Date;
}): TOrderDeliveredNotifyOrder => ({
    orderId: order.orderId,
    userId: String(order.userId),
    items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        total: item.total,
        price: item.price,
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    shippingCost: order.shippingCost,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    updatedAt: order.updatedAt,
});
