export type ApiEnvelope<T> =
  | { data: T }
  | {
      error: {
        message: string;
        issues?: { path: PropertyKey[]; message: string }[];
      };
    };
export type OrderStatus =
  "PENDING" | "CONTACTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type ProductStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
