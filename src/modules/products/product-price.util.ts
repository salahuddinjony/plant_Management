/** Product `discount` is a percentage off (0–100). Returns unit price after discount. */
export const getDiscountedUnitPrice = (price: number, discountPercent = 0): number => {
    const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const unitPrice = price * (1 - pct / 100);
    return Math.round(unitPrice * 100) / 100;
};

export const getLineTotal = (unitPrice: number, quantity: number): number => {
    return Math.round(unitPrice * quantity * 100) / 100;
};

export const roundMoney = (amount: number): number => Math.round(amount * 100) / 100;

/** Savings vs list price when product.discount > 0 */
export const getProductLineDiscount = (
    listPrice: number,
    discountPercent: number,
    quantity: number
): number => {
    const originalTotal = getLineTotal(listPrice, quantity);
    const finalTotal = getLineTotal(getDiscountedUnitPrice(listPrice, discountPercent), quantity);
    return roundMoney(originalTotal - finalTotal);
};
