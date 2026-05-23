export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
  DELETED: "deleted",
} as const;

export const USER_ROLE = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  STAFF: "staff",
  USER: "user",
} as const;
