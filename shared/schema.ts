import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("owner"), // owner, manager, operator
  language: varchar("language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Retail Outlets
export const retailOutlets = pgTable("retail_outlets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  sapcode: varchar("sapcode"),
  oilCompany: varchar("oil_company"),
  address: text("address"),
  phoneNumber: varchar("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fuel Types
export const fuelTypeEnum = pgEnum("fuel_type", ["petrol", "diesel", "premium"]);

// Tanks
export const tanks = pgTable("tanks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  tankNumber: varchar("tank_number").notNull(),
  capacity: decimal("capacity", { precision: 10, scale: 2 }).notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  diameter: decimal("diameter", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dispensing Units
export const dispensingUnits = pgTable("dispensing_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  name: varchar("name").notNull(),
  numberOfNozzles: integer("number_of_nozzles").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nozzles
export const nozzles = pgTable("nozzles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dispensingUnitId: varchar("dispensing_unit_id").references(() => dispensingUnits.id).notNull(),
  tankId: varchar("tank_id").references(() => tanks.id).notNull(),
  nozzleNumber: integer("nozzle_number").notNull(),
  calibrationValidUntil: timestamp("calibration_valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  name: text("name").notNull(),
  pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff Members
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  phoneNumber: varchar("phone_number"),
  role: varchar("role").notNull(), // manager, attendant
  password: varchar("password"), // Password for manager login (only for managers)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Methods
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "credit", "upi", "card"]);

// Nozzle Readings
export const nozzleReadings = pgTable("nozzle_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  nozzleId: varchar("nozzle_id").references(() => nozzles.id).notNull(),
  attendantId: varchar("attendant_id").references(() => staff.id).notNull(),
  shiftType: varchar("shift_type").notNull(), // morning, evening, night
  shiftDate: varchar("shift_date").notNull(),
  previousReading: decimal("previous_reading", { precision: 10, scale: 2 }).notNull(),
  currentReading: decimal("current_reading", { precision: 10, scale: 2 }).notNull(),
  testing: decimal("testing", { precision: 10, scale: 2 }).default("0"),
  totalSale: decimal("total_sale", { precision: 10, scale: 2 }).notNull(),
  cashSales: decimal("cash_sales", { precision: 10, scale: 2 }).default("0"),
  creditSales: decimal("credit_sales", { precision: 10, scale: 2 }).default("0"),
  upiSales: decimal("upi_sales", { precision: 10, scale: 2 }).default("0"),
  cardSales: decimal("card_sales", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shift Sales
export const shiftSales = pgTable("shift_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  shiftDate: timestamp("shift_date").notNull(),
  shiftType: varchar("shift_type").notNull(), // morning, afternoon, night
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  cashSales: decimal("cash_sales", { precision: 10, scale: 2 }).default("0"),
  creditSales: decimal("credit_sales", { precision: 10, scale: 2 }).default("0"),
  upiSales: decimal("upi_sales", { precision: 10, scale: 2 }).default("0"),
  cardSales: decimal("card_sales", { precision: 10, scale: 2 }).default("0"),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  retailOutlets: many(retailOutlets),
  staff: many(staff),
}));

export const retailOutletsRelations = relations(retailOutlets, ({ one, many }) => ({
  owner: one(users, {
    fields: [retailOutlets.ownerId],
    references: [users.id],
  }),
  products: many(products),
  tanks: many(tanks),
  dispensingUnits: many(dispensingUnits),
  staff: many(staff),
  shiftSales: many(shiftSales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [products.retailOutletId],
    references: [retailOutlets.id],
  }),
  tanks: many(tanks),
}));

export const tanksRelations = relations(tanks, ({ one, many }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [tanks.retailOutletId],
    references: [retailOutlets.id],
  }),
  product: one(products, {
    fields: [tanks.productId],
    references: [products.id],
  }),
  dispensingUnits: many(dispensingUnits),
  stockEntries: many(stockEntries),
}));

export const dispensingUnitsRelations = relations(dispensingUnits, ({ one, many }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [dispensingUnits.retailOutletId],
    references: [retailOutlets.id],
  }),
  nozzles: many(nozzles),
}));

export const nozzlesRelations = relations(nozzles, ({ one, many }) => ({
  dispensingUnit: one(dispensingUnits, {
    fields: [nozzles.dispensingUnitId],
    references: [dispensingUnits.id],
  }),
  tank: one(tanks, {
    fields: [nozzles.tankId],
    references: [tanks.id],
  }),
  readings: many(nozzleReadings),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [staff.retailOutletId],
    references: [retailOutlets.id],
  }),
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  shiftSales: many(shiftSales),
  nozzleReadings: many(nozzleReadings),
}));

export const nozzleReadingsRelations = relations(nozzleReadings, ({ one }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [nozzleReadings.retailOutletId],
    references: [retailOutlets.id],
  }),
  nozzle: one(nozzles, {
    fields: [nozzleReadings.nozzleId],
    references: [nozzles.id],
  }),
  attendant: one(staff, {
    fields: [nozzleReadings.attendantId],
    references: [staff.id],
  }),
}));

export const shiftSalesRelations = relations(shiftSales, ({ one }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [shiftSales.retailOutletId],
    references: [retailOutlets.id],
  }),
  staff: one(staff, {
    fields: [shiftSales.staffId],
    references: [staff.id],
  }),
}));

// Insert schemas
export const insertRetailOutletSchema = createInsertSchema(retailOutlets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTankSchema = createInsertSchema(tanks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  capacity: z.union([z.string(), z.number()]).transform(val => String(val)),
  length: z.union([z.string(), z.number()]).transform(val => String(val)),
  diameter: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertDispensingUnitSchema = createInsertSchema(dispensingUnits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNozzleSchema = createInsertSchema(nozzles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNozzleReadingSchema = createInsertSchema(nozzleReadings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  previousReading: z.union([z.string(), z.number()]).transform(val => String(val)),
  currentReading: z.union([z.string(), z.number()]).transform(val => String(val)),
  testing: z.union([z.string(), z.number()]).transform(val => String(val)),
  totalSale: z.union([z.string(), z.number()]).transform(val => String(val)),
  cashSales: z.union([z.string(), z.number()]).transform(val => String(val)),
  creditSales: z.union([z.string(), z.number()]).transform(val => String(val)),
  upiSales: z.union([z.string(), z.number()]).transform(val => String(val)),
  cardSales: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertShiftSalesSchema = createInsertSchema(shiftSales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Shifts table for tracking work shifts and product rates
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  managerId: varchar("manager_id").notNull(),
  shiftType: varchar("shift_type", { enum: ["morning", "evening", "night"] }).notNull(),
  shiftDate: varchar("shift_date"), // YYYY-MM-DD format - nullable for backward compatibility
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: varchar("status", { enum: ["not-started", "active", "completed", "submitted"] }).default("not-started").notNull(),
  productRates: jsonb("product_rates").$type<{productId: string; productName: string; rate: number; observedDensity?: number; observedTemperature?: number; densityAt15C?: number}[]>().default([]),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock Entries for tracking opening stock, receipts, and invoice values per tank
export const stockEntries = pgTable("stock_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailOutletId: varchar("retail_outlet_id").references(() => retailOutlets.id).notNull(),
  tankId: varchar("tank_id").references(() => tanks.id).notNull(),
  managerId: varchar("manager_id").references(() => staff.id).notNull(),
  shiftType: varchar("shift_type", { enum: ["morning", "evening", "night"] }).notNull(),
  shiftDate: varchar("shift_date").notNull(), // YYYY-MM-DD format
  openingStock: decimal("opening_stock", { precision: 10, scale: 2 }).notNull(), // in liters
  receipt: decimal("receipt", { precision: 10, scale: 2 }).notNull(), // liters received
  invoiceValue: decimal("invoice_value", { precision: 10, scale: 2 }).notNull(), // total invoice amount
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock entry relations
export const stockEntriesRelations = relations(stockEntries, ({ one }) => ({
  retailOutlet: one(retailOutlets, {
    fields: [stockEntries.retailOutletId],
    references: [retailOutlets.id],
  }),
  tank: one(tanks, {
    fields: [stockEntries.tankId],
    references: [tanks.id],
  }),
  manager: one(staff, {
    fields: [stockEntries.managerId],
    references: [staff.id],
  }),
}));

// Insert schema for stock entries
export const insertStockEntrySchema = createInsertSchema(stockEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  openingStock: z.union([z.string(), z.number()]).transform(val => String(val)),
  receipt: z.union([z.string(), z.number()]).transform(val => String(val)),
  invoiceValue: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type InsertRetailOutlet = z.infer<typeof insertRetailOutletSchema>;
export type RetailOutlet = typeof retailOutlets.$inferSelect;
export type InsertTank = z.infer<typeof insertTankSchema>;
export type Tank = typeof tanks.$inferSelect & { currentStock?: string; productName?: string; };
export type InsertDispensingUnit = z.infer<typeof insertDispensingUnitSchema>;
export type DispensingUnit = typeof dispensingUnits.$inferSelect;
export type InsertNozzle = z.infer<typeof insertNozzleSchema>;
export type Nozzle = typeof nozzles.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertShiftSales = z.infer<typeof insertShiftSalesSchema>;
export type ShiftSales = typeof shiftSales.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertNozzleReading = z.infer<typeof insertNozzleReadingSchema>;
export type NozzleReading = typeof nozzleReadings.$inferSelect;
export type InsertStockEntry = z.infer<typeof insertStockEntrySchema>;
export type StockEntry = typeof stockEntries.$inferSelect;
