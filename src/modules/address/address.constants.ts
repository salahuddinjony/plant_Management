export const ADDRESS_LABELS = ["home", "office", "other"] as const;
export const DEFAULT_ADDRESS_LABEL = "other" as const;

export type TAddressLabel = (typeof ADDRESS_LABELS)[number];
