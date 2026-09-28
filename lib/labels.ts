export const ORDER_STATUSES = [
  "RECEIVED",
  "SORTING",
  "WASHING",
  "DRYING",
  "FOLDING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ACTIVE: OrderStatus[] = [
  "RECEIVED",
  "SORTING",
  "WASHING",
  "DRYING",
  "FOLDING",
  "READY_FOR_PICKUP",
  "COMPLETED",
];

export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["SORTING", "ON_HOLD", "CANCELLED"],
  SORTING: ["WASHING", "ON_HOLD", "CANCELLED"],
  WASHING: ["DRYING", "ON_HOLD", "CANCELLED"],
  DRYING: ["FOLDING", "ON_HOLD", "CANCELLED"],
  FOLDING: ["READY_FOR_PICKUP", "ON_HOLD", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  ON_HOLD: ["RECEIVED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUSES[from]?.includes(to) ?? false;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "Received",
  SORTING: "Sorting",
  WASHING: "Washing",
  DRYING: "Drying",
  FOLDING: "Folding",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
};

export const STATUS_BADGE: Record<OrderStatus, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  SORTING: "bg-indigo-100 text-indigo-800",
  WASHING: "bg-cyan-100 text-cyan-800",
  DRYING: "bg-teal-100 text-teal-800",
  FOLDING: "bg-amber-100 text-amber-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-200 text-gray-600",
  ON_HOLD: "bg-orange-100 text-orange-800",
};

export const ACTIVE_STATUSES = ACTIVE;

export const PAYMENT_BADGE: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
};

export const PAYMENT_METHODS = ["CASH", "GCASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  GCASH: "GCash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES = [
  "DETERGENT",
  "FABRIC_SOFTENER",
  "ELECTRICITY",
  "WATER",
  "RENT",
  "SALARIES",
  "MAINTENANCE",
  "PACKAGING",
  "TRANSPORTATION",
  "EQUIPMENT",
  "SUPPLIES",
  "OTHER",
] as const;

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  DETERGENT: "Detergent",
  FABRIC_SOFTENER: "Fabric Softener",
  ELECTRICITY: "Electricity",
  WATER: "Water",
  RENT: "Rent",
  SALARIES: "Salaries",
  MAINTENANCE: "Maintenance",
  PACKAGING: "Packaging",
  TRANSPORTATION: "Transportation",
  EQUIPMENT: "Equipment",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};
