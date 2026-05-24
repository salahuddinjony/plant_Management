/**
 * UTC month boundaries for order period filters (inclusive start, exclusive end).
 */
export const getMonthUtcRange = (year: number, month: number): { start: Date; end: Date } => {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    return { start, end };
};
