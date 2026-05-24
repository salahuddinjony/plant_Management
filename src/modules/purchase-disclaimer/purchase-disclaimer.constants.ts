export const PURCHASE_DISCLAIMER_TYPES = [
    "notice",
    "warning",
    "return_policy",
    "live_plant",
    "checkout",
    "terms",
] as const;

export type TPurchaseDisclaimerType = (typeof PURCHASE_DISCLAIMER_TYPES)[number];
