import {
  users,
  retailOutlets,
  products,
  tanks,
  dispensingUnits,
  nozzles,
  staff,
  shiftSales,
  shifts,
  nozzleReadings,
  type User,
  type UpsertUser,
  type RetailOutlet,
  type InsertRetailOutlet,
  type Product,
  type InsertProduct,
  type Tank,
  type InsertTank,
  type DispensingUnit,
  type InsertDispensingUnit,
  type Nozzle,
  type InsertNozzle,
  type Staff,
  type InsertStaff,
  type ShiftSales,
  type InsertShiftSales,
  type Shift,
  type InsertShift,
  type NozzleReading,
  type InsertNozzleReading,
  type StockEntry,
  type InsertStockEntry,
  stockEntries,
} from "./shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Retail Outlet operations
  getRetailOutletByOwnerId(ownerId: string): Promise<RetailOutlet | undefined>;
  createRetailOutlet(outlet: InsertRetailOutlet): Promise<RetailOutlet>;
  updateRetailOutlet(id: string, outlet: Partial<InsertRetailOutlet>): Promise<RetailOutlet>;
  
  // Product operations
  getProductsByRetailOutletId(retailOutletId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Tank operations
  getTanksByRetailOutletId(retailOutletId: string): Promise<Tank[]>;
  createTank(tank: InsertTank): Promise<Tank>;
  updateTank(id: string, tank: Partial<InsertTank>): Promise<Tank>;
  deleteTank(id: string): Promise<void>;
  
  // Dispensing Unit operations
  getDispensingUnitsByRetailOutletId(retailOutletId: string): Promise<DispensingUnit[]>;
  createDispensingUnit(unit: InsertDispensingUnit): Promise<DispensingUnit>;
  updateDispensingUnit(id: string, unit: Partial<InsertDispensingUnit>): Promise<DispensingUnit>;
  deleteDispensingUnit(id: string): Promise<void>;

  // Nozzle operations
  getNozzlesByDispensingUnitId(dispensingUnitId: string): Promise<Nozzle[]>;
  getNozzlesByRetailOutletId(retailOutletId: string): Promise<Nozzle[]>;
  createNozzle(nozzle: InsertNozzle): Promise<Nozzle>;
  updateNozzle(id: string, nozzle: Partial<InsertNozzle>): Promise<Nozzle>;
  deleteNozzle(id: string): Promise<void>;

  // Nozzle Reading operations
  getNozzleReadings(retailOutletId: string, shiftType?: string, shiftDate?: string): Promise<NozzleReading[]>;
  getNozzleReadingsByAttendant(attendantId: string, shiftType?: string, shiftDate?: string): Promise<NozzleReading[]>;
  createNozzleReading(reading: InsertNozzleReading): Promise<NozzleReading>;
  updateNozzleReading(id: string, reading: Partial<InsertNozzleReading>): Promise<NozzleReading>;
  getLastNozzleReading(nozzleId: string): Promise<NozzleReading | undefined>;
  
  // Staff operations
  getStaffByRetailOutletId(retailOutletId: string): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | undefined>;
  createStaff(staffMember: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staffMember: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  getManagerByCredentials(phoneNumber: string, password: string): Promise<Staff | undefined>;
  
  // Shift Sales operations
  getShiftSalesByRetailOutletId(retailOutletId: string, limit?: number): Promise<ShiftSales[]>;
  createShiftSales(sales: InsertShiftSales): Promise<ShiftSales>;
  updateShiftSales(id: string, sales: Partial<InsertShiftSales>): Promise<ShiftSales>;
  getShiftSalesStats(retailOutletId: string): Promise<{
    weeklySales: number;
    monthlySales: number;
    paymentMethodBreakdown: {
      cash: number;
      credit: number;
      upi: number;
      card: number;
    };
  }>;

  // Shift operations for managers
  getCurrentShift(managerId: string): Promise<any>;
  getLastProductRates(managerId: string): Promise<any[]>;
  saveProductRates(managerId: string, shiftType: string, rates: any[]): Promise<void>;
  startShift(managerId: string, shiftType: string, productRates: any[]): Promise<any>;
  submitShiftData(managerId: string, shiftType: string, shiftDate: string): Promise<void>;
  isShiftSubmitted(managerId: string, shiftType: string, shiftDate: string): Promise<boolean>;

  // Stock Entry operations
  getStockEntries(retailOutletId: string, shiftType?: string, shiftDate?: string): Promise<any[]>;
  getStockEntriesByTank(tankId: string, shiftType?: string, shiftDate?: string): Promise<StockEntry[]>;
  createStockEntry(entry: InsertStockEntry): Promise<StockEntry>;
  updateStockEntry(id: string, entry: Partial<InsertStockEntry>): Promise<StockEntry>;
  getTanksByRetailOutletIdWithProduct(retailOutletId: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Retail Outlet operations
  async getRetailOutletByOwnerId(ownerId: string): Promise<RetailOutlet | undefined> {
    const [outlet] = await db
      .select()
      .from(retailOutlets)
      .where(eq(retailOutlets.ownerId, ownerId));
    return outlet;
  }

  async createRetailOutlet(outlet: InsertRetailOutlet): Promise<RetailOutlet> {
    const [newOutlet] = await db
      .insert(retailOutlets)
      .values(outlet)
      .returning();
    return newOutlet;
  }

  async updateRetailOutlet(id: string, outlet: Partial<InsertRetailOutlet>): Promise<RetailOutlet> {
    const [updatedOutlet] = await db
      .update(retailOutlets)
      .set({ ...outlet, updatedAt: new Date() })
      .where(eq(retailOutlets.id, id))
      .returning();
    return updatedOutlet;
  }

  // Product operations
  async getProductsByRetailOutletId(retailOutletId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.retailOutletId, retailOutletId), eq(products.isActive, true)))
      .orderBy(products.name);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  // Tank operations
  async getTanksByRetailOutletId(retailOutletId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get tanks with product information
    const tanksWithProduct = await db
      .select({
        id: tanks.id,
        retailOutletId: tanks.retailOutletId,
        productId: tanks.productId,
        tankNumber: tanks.tankNumber,
        capacity: tanks.capacity,
        length: tanks.length,
        diameter: tanks.diameter,
        isActive: tanks.isActive,
        createdAt: tanks.createdAt,
        updatedAt: tanks.updatedAt,
        productName: products.name,
      })
      .from(tanks)
      .innerJoin(products, eq(tanks.productId, products.id))
      .where(and(eq(tanks.retailOutletId, retailOutletId), eq(tanks.isActive, true)))
      .orderBy(tanks.tankNumber);

    // Calculate current stock for each tank
    const tanksWithStock = await Promise.all(
      tanksWithProduct.map(async (tank) => {
        // Get the latest stock entry for this tank
        const latestStockEntry = await db
          .select()
          .from(stockEntries)
          .where(eq(stockEntries.tankId, tank.id))
          .orderBy(desc(stockEntries.shiftDate), desc(stockEntries.createdAt))
          .limit(1);

        // Get total fuel dispensed from nozzle readings since the stock entry
        const stockEntryDate = latestStockEntry[0]?.shiftDate || today;
        
        const totalDispensed = await db
          .select({
            totalDispensed: sql<string>`COALESCE(SUM(${nozzleReadings.currentReading} - ${nozzleReadings.previousReading} - COALESCE(${nozzleReadings.testing}, 0)), 0)`,
          })
          .from(nozzleReadings)
          .innerJoin(nozzles, eq(nozzleReadings.nozzleId, nozzles.id))
          .where(
            and(
              eq(nozzles.tankId, tank.id),
              gte(nozzleReadings.shiftDate, stockEntryDate)
            )
          );

        // Calculate current stock: opening stock + receipts - dispensed
        const openingStock = parseFloat(latestStockEntry[0]?.openingStock || "0");
        const receipts = parseFloat(latestStockEntry[0]?.receipt || "0");
        const dispensed = parseFloat(totalDispensed[0]?.totalDispensed || "0");
        const currentStock = Math.max(0, openingStock + receipts - dispensed);

        return {
          ...tank,
          currentStock: currentStock.toString(),
        };
      })
    );

    return tanksWithStock;
  }

  async createTank(tank: InsertTank): Promise<Tank> {
    const [newTank] = await db
      .insert(tanks)
      .values(tank)
      .returning();
    return newTank;
  }

  async updateTank(id: string, tank: Partial<InsertTank>): Promise<Tank> {
    const [updatedTank] = await db
      .update(tanks)
      .set({ ...tank, updatedAt: new Date() })
      .where(eq(tanks.id, id))
      .returning();
    return updatedTank;
  }

  async deleteTank(id: string): Promise<void> {
    await db
      .update(tanks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tanks.id, id));
  }

  // Dispensing Unit operations
  async getDispensingUnitsByRetailOutletId(retailOutletId: string): Promise<DispensingUnit[]> {
    return await db
      .select()
      .from(dispensingUnits)
      .where(and(eq(dispensingUnits.retailOutletId, retailOutletId), eq(dispensingUnits.isActive, true)))
      .orderBy(dispensingUnits.name);
  }

  async createDispensingUnit(unit: InsertDispensingUnit): Promise<DispensingUnit> {
    const [newUnit] = await db
      .insert(dispensingUnits)
      .values(unit)
      .returning();
    return newUnit;
  }

  async updateDispensingUnit(id: string, unit: Partial<InsertDispensingUnit>): Promise<DispensingUnit> {
    const [updatedUnit] = await db
      .update(dispensingUnits)
      .set({ ...unit, updatedAt: new Date() })
      .where(eq(dispensingUnits.id, id))
      .returning();
    return updatedUnit;
  }

  async deleteDispensingUnit(id: string): Promise<void> {
    await db
      .update(dispensingUnits)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dispensingUnits.id, id));
  }

  // Nozzle operations
  async getNozzlesByDispensingUnitId(dispensingUnitId: string): Promise<Nozzle[]> {
    return await db
      .select()
      .from(nozzles)
      .where(and(eq(nozzles.dispensingUnitId, dispensingUnitId), eq(nozzles.isActive, true)))
      .orderBy(nozzles.nozzleNumber);
  }

  async createNozzle(nozzle: InsertNozzle): Promise<Nozzle> {
    const [newNozzle] = await db
      .insert(nozzles)
      .values(nozzle)
      .returning();
    return newNozzle;
  }

  async updateNozzle(id: string, nozzle: Partial<InsertNozzle>): Promise<Nozzle> {
    const [updatedNozzle] = await db
      .update(nozzles)
      .set({ ...nozzle, updatedAt: new Date() })
      .where(eq(nozzles.id, id))
      .returning();
    return updatedNozzle;
  }

  async deleteNozzle(id: string): Promise<void> {
    await db
      .update(nozzles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(nozzles.id, id));
  }

  // Staff operations
  async getStaffByRetailOutletId(retailOutletId: string): Promise<Staff[]> {
    return await db
      .select()
      .from(staff)
      .where(eq(staff.retailOutletId, retailOutletId))
      .orderBy(staff.name);
  }

  async getStaffById(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(eq(staff.id, id));
    return staffMember;
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [newStaff] = await db
      .insert(staff)
      .values(staffMember)
      .returning();
    return newStaff;
  }

  async updateStaff(id: string, staffMember: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...staffMember, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(id: string): Promise<void> {
    await db
      .update(staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(staff.id, id));
  }

  async getManagerByCredentials(phoneNumber: string, password: string): Promise<Staff | undefined> {
    console.log("Searching for manager with phoneNumber:", phoneNumber, "password:", password ? "***" : "empty");
    const [manager] = await db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.phoneNumber, phoneNumber),
          eq(staff.password, password),
          eq(staff.role, "manager"),
          eq(staff.isActive, true)
        )
      );
    console.log("Manager query result:", manager ? `Found: ${manager.name}` : "Not found");
    return manager;
  }

  // Shift Sales operations - aggregate from nozzle readings
  async getShiftSalesByRetailOutletId(retailOutletId: string, limit = 10): Promise<any[]> {
    // Get distinct shift dates and types from nozzle readings
    const shiftGroups = await db
      .select({
        shiftDate: nozzleReadings.shiftDate,
        shiftType: nozzleReadings.shiftType,
        totalCashSales: sql<string>`SUM(${nozzleReadings.cashSales})`,
        totalCreditSales: sql<string>`SUM(${nozzleReadings.creditSales})`,
        totalUpiSales: sql<string>`SUM(${nozzleReadings.upiSales})`,
        totalCardSales: sql<string>`SUM(${nozzleReadings.cardSales})`,
        totalSales: sql<string>`SUM(${nozzleReadings.totalSale})`,
        staffId: nozzleReadings.attendantId,
        staffName: staff.name,
      })
      .from(nozzleReadings)
      .innerJoin(staff, eq(nozzleReadings.attendantId, staff.id))
      .where(eq(nozzleReadings.retailOutletId, retailOutletId))
      .groupBy(nozzleReadings.shiftDate, nozzleReadings.shiftType, nozzleReadings.attendantId, staff.name)
      .orderBy(desc(nozzleReadings.shiftDate), nozzleReadings.shiftType)
      .limit(limit);

    // Transform the data to match the ShiftSales interface
    return shiftGroups.map((group) => ({
      id: `${group.shiftDate}-${group.shiftType}-${group.staffId}`,
      retailOutletId,
      staffId: group.staffId,
      staffName: group.staffName,
      shiftDate: new Date(group.shiftDate + 'T00:00:00'), // Convert string date to Date
      shiftType: group.shiftType,
      startTime: new Date(group.shiftDate + 'T06:00:00'), // Mock start time
      endTime: new Date(group.shiftDate + 'T18:00:00'), // Mock end time
      cashSales: group.totalCashSales || "0",
      creditSales: group.totalCreditSales || "0",
      upiSales: group.totalUpiSales || "0",
      cardSales: group.totalCardSales || "0",
      totalSales: group.totalSales || "0",
      notes: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async createShiftSales(sales: InsertShiftSales): Promise<ShiftSales> {
    const totalSales = Number(sales.cashSales || 0) + 
                     Number(sales.creditSales || 0) + 
                     Number(sales.upiSales || 0) + 
                     Number(sales.cardSales || 0);
    
    const [newSales] = await db
      .insert(shiftSales)
      .values({ ...sales, totalSales: totalSales.toString() })
      .returning();
    return newSales;
  }

  async updateShiftSales(id: string, sales: Partial<InsertShiftSales>): Promise<ShiftSales> {
    const [updatedSales] = await db
      .update(shiftSales)
      .set({ ...sales, updatedAt: new Date() })
      .where(eq(shiftSales.id, id))
      .returning();
    return updatedSales;
  }

  async getShiftSalesStats(retailOutletId: string): Promise<{
    weeklySales: number;
    monthlySales: number;
    paymentMethodBreakdown: {
      cash: number;
      credit: number;
      upi: number;
      card: number;
    };
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [weeklyResult] = await db
      .select({
        totalSales: sql<number>`SUM(CAST(total_sales AS DECIMAL))`,
      })
      .from(shiftSales)
      .where(
        and(
          eq(shiftSales.retailOutletId, retailOutletId),
          sql`shift_date >= ${weekAgo}`
        )
      );

    const [monthlyResult] = await db
      .select({
        totalSales: sql<number>`SUM(CAST(total_sales AS DECIMAL))`,
      })
      .from(shiftSales)
      .where(
        and(
          eq(shiftSales.retailOutletId, retailOutletId),
          sql`shift_date >= ${monthAgo}`
        )
      );

    const [paymentBreakdown] = await db
      .select({
        cash: sql<number>`SUM(CAST(cash_sales AS DECIMAL))`,
        credit: sql<number>`SUM(CAST(credit_sales AS DECIMAL))`,
        upi: sql<number>`SUM(CAST(upi_sales AS DECIMAL))`,
        card: sql<number>`SUM(CAST(card_sales AS DECIMAL))`,
      })
      .from(shiftSales)
      .where(
        and(
          eq(shiftSales.retailOutletId, retailOutletId),
          sql`shift_date >= ${monthAgo}`
        )
      );

    return {
      weeklySales: weeklyResult?.totalSales || 0,
      monthlySales: monthlyResult?.totalSales || 0,
      paymentMethodBreakdown: {
        cash: paymentBreakdown?.cash || 0,
        credit: paymentBreakdown?.credit || 0,
        upi: paymentBreakdown?.upi || 0,
        card: paymentBreakdown?.card || 0,
      },
    };
  }

  // Stock Entry operations
  async getStockEntries(retailOutletId: string, shiftType?: string, shiftDate?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        id: stockEntries.id,
        tankId: stockEntries.tankId,
        shiftType: stockEntries.shiftType,
        shiftDate: stockEntries.shiftDate,
        openingStock: stockEntries.openingStock,
        receipt: stockEntries.receipt,
        invoiceValue: stockEntries.invoiceValue,
        createdAt: stockEntries.createdAt,
        updatedAt: stockEntries.updatedAt,
        tankNumber: tanks.tankNumber,
        productName: products.name,
        productId: products.id,
      })
      .from(stockEntries)
      .innerJoin(tanks, eq(stockEntries.tankId, tanks.id))
      .innerJoin(products, eq(tanks.productId, products.id));

    if (shiftType && shiftDate) {
      return await baseQuery.where(
        and(
          eq(stockEntries.retailOutletId, retailOutletId),
          sql`${stockEntries.shiftType} = ${shiftType}`,
          eq(stockEntries.shiftDate, shiftDate)
        )
      );
    }

    return await baseQuery.where(eq(stockEntries.retailOutletId, retailOutletId));
  }

  async getStockEntriesByTank(tankId: string, shiftType?: string, shiftDate?: string): Promise<StockEntry[]> {
    const baseQuery = db.select().from(stockEntries);

    if (shiftType && shiftDate) {
      return await baseQuery.where(
        and(
          eq(stockEntries.tankId, tankId),
          sql`${stockEntries.shiftType} = ${shiftType}`,
          eq(stockEntries.shiftDate, shiftDate)
        )
      );
    }

    return await baseQuery.where(eq(stockEntries.tankId, tankId));
  }

  async createStockEntry(entry: InsertStockEntry): Promise<StockEntry> {
    const [createdEntry] = await db.insert(stockEntries).values(entry).returning();
    return createdEntry;
  }

  async updateStockEntry(id: string, entry: Partial<InsertStockEntry>): Promise<StockEntry> {
    const [updatedEntry] = await db
      .update(stockEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(stockEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async getTanksByRetailOutletIdWithProduct(retailOutletId: string): Promise<any[]> {
    return await db
      .select({
        id: tanks.id,
        tankNumber: tanks.tankNumber,
        capacity: tanks.capacity,
        productName: products.name,
        productId: products.id,
        isActive: tanks.isActive,
      })
      .from(tanks)
      .innerJoin(products, eq(tanks.productId, products.id))
      .where(eq(tanks.retailOutletId, retailOutletId))
      .orderBy(tanks.tankNumber);
  }

  async submitShiftData(managerId: string, shiftType: string, shiftDate: string): Promise<void> {
    // Update or create shift record with submitted status
    const existingShift = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.managerId, managerId),
          sql`${shifts.shiftType} = ${shiftType}`,
          eq(shifts.shiftDate, shiftDate)
        )
      )
      .limit(1);

    if (existingShift.length > 0) {
      await db
        .update(shifts)
        .set({ 
          status: "submitted", 
          submittedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(shifts.id, existingShift[0].id));
    } else {
      await db.insert(shifts).values({
        managerId,
        shiftType: shiftType as "morning" | "evening" | "night",
        shiftDate,
        status: "submitted",
        submittedAt: new Date(),
      });
    }
  }

  async isShiftSubmitted(managerId: string, shiftType: string, shiftDate: string): Promise<boolean> {
    const shift = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.managerId, managerId),
          sql`${shifts.shiftType} = ${shiftType}`,
          eq(shifts.shiftDate, shiftDate),
          eq(shifts.status, "submitted")
        )
      )
      .limit(1);

    return shift.length > 0;
  }

  // Shift operations for managers (mock implementation for now)
  async getCurrentShift(managerId: string): Promise<any> {
    // Mock implementation - return null for no active shift
    return null;
  }

  async getLastProductRates(managerId: string, targetDate?: string, targetShiftType?: string): Promise<any[]> {
    console.log(`Getting last rates for manager ${managerId}, date: ${targetDate}, shift: ${targetShiftType}`);
    
    // If specific date and shift are provided, get that shift
    if (targetDate && targetShiftType) {
      const [specificShift] = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.managerId, managerId),
            eq(shifts.shiftType, targetShiftType as any),
            sql`DATE(created_at) = ${targetDate}`
          )
        )
        .limit(1);

      if (specificShift?.productRates) {
        console.log(`Found specific shift rates:`, specificShift.productRates);
        return specificShift.productRates as any[];
      }
    }

    // If no specific match, try to find the same shift type from previous days
    if (targetShiftType) {
      const [recentShiftOfType] = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.managerId, managerId),
            eq(shifts.shiftType, targetShiftType as any)
          )
        )
        .orderBy(desc(shifts.updatedAt))
        .limit(1);

      if (recentShiftOfType?.productRates) {
        console.log(`Found recent shift of same type:`, recentShiftOfType.productRates);
        return recentShiftOfType.productRates as any[];
      }
    }

    // Finally, get the most recent shift for this manager regardless of type
    const [latestShift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.managerId, managerId))
      .orderBy(desc(shifts.updatedAt))
      .limit(1);

    if (latestShift?.productRates) {
      console.log(`Found latest shift rates:`, latestShift.productRates);
      return latestShift.productRates as any[];
    }

    console.log(`No rates found for manager ${managerId}`);
    return [];
  }

  async saveProductRates(managerId: string, shiftType: string, rates: any[], targetDate?: string): Promise<void> {
    console.log(`Saving rates for manager ${managerId}, shift ${shiftType}, date ${targetDate}:`, rates);
    
    // Get manager's retail outlet
    const manager = await this.getStaffById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    // Create or update shift record with product rates for specific date
    const whereConditions = [
      eq(shifts.managerId, managerId),
      eq(shifts.shiftType, shiftType as any)
    ];

    if (targetDate) {
      whereConditions.push(sql`DATE(created_at) = ${targetDate}`);
    }

    const [existingShift] = await db
      .select()
      .from(shifts)
      .where(and(...whereConditions))
      .limit(1);

    if (existingShift) {
      // Update existing shift with new rates
      await db
        .update(shifts)
        .set({
          productRates: rates,
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, existingShift.id));
    } else {
      // Create new shift record
      await db
        .insert(shifts)
        .values({
          managerId: managerId,
          shiftType: shiftType as any,
          productRates: rates,
          status: 'not-started',
        });
    }
  }

  async startShift(managerId: string, shiftType: string, productRates: any[]): Promise<any> {
    // Mock implementation - would create new shift record
    return {
      id: 'mock-shift-id',
      managerId,
      shiftType,
      status: 'active',
      startTime: new Date().toISOString(),
      productRates,
    };
  }

  // Nozzle Reading operations
  async getNozzleReadings(retailOutletId: string, shiftType?: string, shiftDate?: string): Promise<any[]> {
    const whereConditions = [eq(nozzleReadings.retailOutletId, retailOutletId)];
    
    if (shiftType) {
      whereConditions.push(eq(nozzleReadings.shiftType, shiftType));
    }
    
    if (shiftDate) {
      whereConditions.push(eq(nozzleReadings.shiftDate, shiftDate));
    }

    console.log('[STORAGE] Query conditions:', {retailOutletId, shiftType, shiftDate});

    const rawReadings = await db
      .select()
      .from(nozzleReadings)
      .where(and(...whereConditions))
      .orderBy(desc(nozzleReadings.createdAt));

    console.log('[STORAGE] Raw readings found:', rawReadings.length);
    if (rawReadings.length > 0) {
      console.log('[STORAGE] First raw reading:', rawReadings[0]);
    }

    // Manually join with nozzle and attendant data
    const enrichedReadings = [];
    for (const reading of rawReadings) {
      // Get nozzle info
      const [nozzleData] = await db
        .select({
          id: nozzles.id,
          nozzleNumber: nozzles.nozzleNumber,
          productName: products.name,
          productId: products.id,
        })
        .from(nozzles)
        .leftJoin(tanks, eq(nozzles.tankId, tanks.id))
        .leftJoin(products, eq(tanks.productId, products.id))
        .where(eq(nozzles.id, reading.nozzleId))
        .limit(1);

      // Get attendant info
      const [attendantData] = await db
        .select({
          id: staff.id,
          name: staff.name,
        })
        .from(staff)
        .where(eq(staff.id, reading.attendantId))
        .limit(1);

      enrichedReadings.push({
        ...reading,
        nozzle: nozzleData || null,
        attendant: attendantData || null,
      });
    }

    return enrichedReadings;
  }

  async getNozzleReadingsByAttendant(attendantId: string, shiftType?: string, shiftDate?: string): Promise<NozzleReading[]> {
    const whereConditions = [eq(nozzleReadings.attendantId, attendantId)];
    
    if (shiftType) {
      whereConditions.push(eq(nozzleReadings.shiftType, shiftType));
    }
    
    if (shiftDate) {
      whereConditions.push(eq(nozzleReadings.shiftDate, shiftDate));
    }

    return await db
      .select()
      .from(nozzleReadings)
      .where(and(...whereConditions))
      .orderBy(desc(nozzleReadings.createdAt));
  }

  async createNozzleReading(reading: InsertNozzleReading): Promise<NozzleReading> {
    const [newReading] = await db
      .insert(nozzleReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateNozzleReading(id: string, reading: Partial<InsertNozzleReading>): Promise<NozzleReading> {
    const [updatedReading] = await db
      .update(nozzleReadings)
      .set({
        ...reading,
        updatedAt: new Date(),
      })
      .where(eq(nozzleReadings.id, id))
      .returning();
    return updatedReading;
  }

  async getLastNozzleReading(nozzleId: string): Promise<NozzleReading | undefined> {
    const [reading] = await db
      .select()
      .from(nozzleReadings)
      .where(eq(nozzleReadings.nozzleId, nozzleId))
      .orderBy(desc(nozzleReadings.createdAt))
      .limit(1);
    return reading;
  }

  async getNozzlesByRetailOutletId(retailOutletId: string): Promise<any[]> {
    return await db
      .select({
        id: nozzles.id,
        dispensingUnitId: nozzles.dispensingUnitId,
        tankId: nozzles.tankId,
        nozzleNumber: nozzles.nozzleNumber,
        calibrationValidUntil: nozzles.calibrationValidUntil,
        isActive: nozzles.isActive,
        createdAt: nozzles.createdAt,
        updatedAt: nozzles.updatedAt,
        dispensingUnitName: dispensingUnits.name,
        tankNumber: tanks.tankNumber,
        productName: products.name,
        productId: products.id, // Add productId for rate matching
      })
      .from(nozzles)
      .innerJoin(dispensingUnits, eq(nozzles.dispensingUnitId, dispensingUnits.id))
      .innerJoin(tanks, eq(nozzles.tankId, tanks.id))
      .innerJoin(products, eq(tanks.productId, products.id))
      .where(eq(dispensingUnits.retailOutletId, retailOutletId));
  }
}

export const storage = new DatabaseStorage();
