export const AUTHORIZE_RATE_LIMIT_TOKENS = 20;
export const AUTHORIZE_RATE_LIMIT_WINDOW = "60 s" as const;

export const REVOKE_RATE_LIMIT_TOKENS = 20;
export const REVOKE_RATE_LIMIT_WINDOW = "60 s" as const;

export const ORDER_CRUD_RATE_LIMIT_TOKENS = 30;
export const ORDER_CRUD_RATE_LIMIT_WINDOW = "60 s" as const;

export const VENDOR_CRUD_RATE_LIMIT_TOKENS = 30;
export const VENDOR_CRUD_RATE_LIMIT_WINDOW = "60 s" as const;

/** MACADDR regex: 6 hex octets separated by colons or hyphens */
export const MACADDR_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
