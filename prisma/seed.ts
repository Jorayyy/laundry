import { PrismaClient, PricingType, OrderStatus, ExpenseCategory, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SERVICES: { name: string; pricingType: PricingType; price: number; description?: string }[] = [
  { name: "Wash-Dry-Fold", pricingType: "PER_KG", price: 55, description: "Standard wash, dry, and fold per kilo" },
  { name: "Express Laundry", pricingType: "PER_KG", price: 85, description: "Same-day service per kilo" },
  { name: "Wash-Dry", pricingType: "PER_KG", price: 40, description: "No folding, per kilo" },
  { name: "Dry Only", pricingType: "PER_KG", price: 25, description: "Drying service per kilo" },
  { name: "Comforter", pricingType: "PER_ITEM", price: 180, description: "Single comforter" },
  { name: "Blanket", pricingType: "PER_ITEM", price: 120 },
  { name: "Bedsheet Set", pricingType: "PER_ITEM", price: 75 },
  { name: "Curtain", pricingType: "PER_ITEM", price: 90 },
  { name: "Uniform / Workwear", pricingType: "PER_ITEM", price: 45 },
  { name: "Self-Service (per load)", pricingType: "FIXED", price: 150 },
  { name: "Pickup & Delivery Fee", pricingType: "FIXED", price: 80 },
  { name: "Stain Treatment", pricingType: "FIXED", price: 50 },
];

const NAMES = [
  ["Juan Dela Cruz", "09171234567"],
  ["Maria Santos", "09182345678"],
  ["Jose Ramos", "09193456789"],
  ["Ana Villanueva", "09204567891"],
  ["Pedro Reyes", "09215678901"],
  ["Liza Mendoza", "09226789012"],
  ["Carlo Gonzales", "09237890123"],
  ["Grace Lim", "09248901234"],
  ["Mark Ty", "09259012344"],
  ["Rhona Padilla", "09260123455"],
  ["Danilo Aquino", "09171112223"],
  ["Sara Bautista", "09182223334"],
  ["Rico Fernandez", "09193334445"],
  ["Mika Ocampo", "09204445556"],
  ["Benjie Cruz", "09215556667"],
  ["Trina Lopez", "09226667778"],
  ["Omar Abdul", "09237778889"],
  ["Nica Perez", "09248889990"],
  ["Victor Tan", "09259990001"],
  ["Ella Sy", "09261010102"],
  ["Jun Bacani", "09171212123"],
  ["Kim Co", "09182323234"],
];

const EXPENSES: { category: ExpenseCategory; amount: number; description: string }[] = [
  { category: "DETERGENT", amount: 1250, description: "Ariel 3kg refill" },
  { category: "FABRIC_SOFTENER", amount: 680, description: "Downy 1.5L x2" },
  { category: "ELECTRICITY", amount: 4800, description: "Meralco bill" },
  { category: "WATER", amount: 950, description: "Water bill" },
  { category: "RENT", amount: 12000, description: "Monthly shop rent" },
  { category: "PACKAGING", amount: 320, description: "Plastic bags and hangers" },
  { category: "MAINTENANCE", amount: 1500, description: "Washer belt replacement" },
  { category: "TRANSPORTATION", amount: 400, description: "Delivery fuel" },
  { category: "SUPPLIES", amount: 260, description: "Bleach and stain remover" },
  { category: "OTHER", amount: 200, description: "Receipt paper rolls" },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const owner = await db.user.upsert({
    where: { email: "owner@laundry.ph" },
    update: {},
    create: { name: "Shop Owner", email: "owner@laundry.ph", role: "OWNER", passwordHash: password },
  });
  const staff = await db.user.upsert({
    where: { email: "staff@laundry.ph" },
    update: {},
    create: { name: "Staff Ana", email: "staff@laundry.ph", role: "STAFF", passwordHash: password },
  });

  await db.settings.upsert({
    where: { id: "single" },
    update: {},
    create: {
      id: "single",
      businessName: "Fresh Cycle Laundry",
      address: "123 Rizal Ave, Tacloban City, Leyte",
      phone: "0917 000 1234",
      email: "hello@freshcycle.ph",
      orderPrefix: "FC",
      receiptFooter:
        "Present this stub upon claiming. Claims without this stub may require ID verification. Items not claimed after 30 days may be disposed.",
    },
  });

  const services: Record<string, { id: string }> = {};
  for (const s of SERVICES) {
    services[s.name] = await db.service.upsert({
      where: { name: s.name },
      update: { price: s.price, pricingType: s.pricingType },
      create: { name: s.name, price: s.price, pricingType: s.pricingType, description: s.description },
    });
  }

  const customers = await Promise.all(
    NAMES.map(async ([name, phone], i) =>
      db.customer.upsert({
        where: { id: `seed-customer-${i + 1}` },
        update: {},
        create: {
          id: `seed-customer-${i + 1}`,
          name,
          phone,
          email: i % 3 === 0 ? `${name.split(" ")[0].toLowerCase()}@mail.com` : null,
          address: i % 4 === 0 ? `Purok ${i + 1}, Tacloban City` : null,
          notes: i === 2 ? "Allergic to strong fragrance" : null,
        },
      })
    )
  );

  await db.orderCounter.upsert({ where: { key: "order" }, update: {}, create: { key: "order", value: 0 } });

  const statuses: OrderStatus[] = [
    "RECEIVED", "SORTING", "WASHING", "DRYING", "FOLDING", "READY_FOR_PICKUP", "COMPLETED", "COMPLETED", "CANCELLED", "ON_HOLD",
  ];
  const methods: PaymentMethod[] = ["CASH", "GCASH", "BANK_TRANSFER", "CARD", "OTHER"];

  let orderNo = 0;
  const existing = await db.order.count();
  if (existing === 0) {
    for (let i = 0; i < 40; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[i % statuses.length];
      const createdAt = daysAgo(Math.floor(Math.random() * 20));
      const lineCount = 1 + (i % 3);
      const picked = [...SERVICES].sort(() => Math.random() - 0.5).slice(0, lineCount);

      const lines = picked.map((s) => {
        const quantity = s.pricingType === "PER_KG" ? Math.round((5 + Math.random() * 15) * 10) / 10 : 1 + Math.floor(Math.random() * 3);
        const subtotal =
          s.pricingType === "FIXED" ? s.price : Math.round(s.price * quantity * 100) / 100;
        return { serviceId: services[s.name].id, serviceName: s.name, pricingType: s.pricingType, unitPrice: s.price, quantity, subtotal };
      });

      const subtotal = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;
      const discount = i % 7 === 0 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total = Math.round((subtotal - discount) * 100) / 100;

      const paymentRoll = status === "CANCELLED" ? 0 : Math.random();
      const paid =
        paymentRoll > 0.55 ? total : paymentRoll > 0.25 ? Math.round(total * 0.5 * 100) / 100 : 0;
      const paymentStatus = paid <= 0 ? "UNPAID" : paid + 0.01 >= total ? "PAID" : "PARTIAL";

      const counter = await db.orderCounter.update({
        where: { key: "order" },
        data: { value: { increment: 1 } },
      });
      orderNo = counter.value;

      const createdBy = i % 3 === 0 ? staff : owner;

      const order = await db.order.create({
        data: {
          orderNo: `FC-${String(orderNo).padStart(5, "0")}`,
          status,
          paymentStatus,
          receivedAt: createdAt,
          dueAt: new Date(createdAt.getTime() + 24 * 3600 * 1000),
          completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + 30 * 3600 * 1000) : null,
          subtotal,
          discount,
          total,
          paidAmount: paid,
          customerId: customer.id,
          createdById: createdBy.id,
          updatedById: createdBy.id,
          notes: i % 5 === 0 ? "Call before pickup" : null,
          items: { create: lines },
          activities: {
            create: [
              { userId: createdBy.id, action: "CREATED", toStatus: "RECEIVED", createdAt },
              ...(status !== "RECEIVED" && status !== "CANCELLED"
                ? [{ userId: createdBy.id, action: "STATUS_CHANGED", fromStatus: "RECEIVED" as OrderStatus, toStatus: status, createdAt: new Date(createdAt.getTime() + 3600 * 1000) }]
                : []),
            ],
          },
        },
      });

      if (paid > 0) {
        await db.payment.create({
          data: {
            orderId: order.id,
            amount: paid,
            method: methods[i % methods.length],
            paidAt: new Date(createdAt.getTime() + 600000),
            createdById: createdBy.id,
            reference: i % 4 === 0 ? `REF${1000 + i}` : null,
          },
        });
      }
    }
  }

  const expenseCount = await db.expense.count();
  if (expenseCount === 0) {
    for (let i = 0; i < 30; i++) {
      const e = EXPENSES[i % EXPENSES.length];
      await db.expense.create({
        data: {
          category: e.category,
          description: e.description,
          amount: Math.round(e.amount * (0.6 + Math.random() * 0.8) * 100) / 100,
          spentAt: daysAgo(Math.floor(Math.random() * 25)),
          method: methods[i % methods.length],
          createdById: owner.id,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Owner: owner@laundry.ph / password123");
  console.log("Staff: staff@laundry.ph / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
