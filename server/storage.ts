import {
  users,
  mediators,
  accounts,
  orders,
  notifications,
  userSettings,
  activityLogs,
  bankAccounts,
  type User,
  type UpsertUser,
  type Mediator,
  type InsertMediator,
  type Account,
  type InsertAccount,
  type Order,
  type InsertOrder,
  type OrderWithRelations,
  type Notification,
  type InsertNotification,
  type NotificationWithOrder,
  type UserSettingsSelect,
  type InsertUserSettings,
  type ActivityLog,
  type InsertActivityLog,
  type ActivityLogWithOrder,
  type BankAccount,
  type InsertBankAccount,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count, sum, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Mediator operations
  getMediators(userId: string): Promise<Mediator[]>;
  getMediator(id: string): Promise<Mediator | undefined>;
  createMediator(userId: string, mediator: InsertMediator): Promise<Mediator>;
  updateMediator(id: string, userId: string, mediator: Partial<InsertMediator>): Promise<Mediator | undefined>;
  deleteMediator(id: string, userId: string): Promise<boolean>;

  // Account operations
  getAccounts(userId: string): Promise<Account[]>;
  getAccountsByPlatform(userId: string, platform: Account['platform']): Promise<Account[]>;
  createAccount(userId: string, account: InsertAccount): Promise<Account>;
  updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string, userId: string): Promise<boolean>;

  // Bank Account operations
  getBankAccounts(userId: string): Promise<BankAccount[]>;
  getActiveBankAccounts(userId: string): Promise<BankAccount[]>;
  createBankAccount(userId: string, bankAccount: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, userId: string, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: string, userId: string): Promise<boolean>;

  // Order operations
  getOrders(userId: string, filters?: {
    status?: Order['currentStatus'];
    mediatorId?: string;
    platform?: Order['platform'];
    accountId?: string;
  }): Promise<OrderWithRelations[]>;
  getOrder(id: string, userId: string): Promise<OrderWithRelations | undefined>;
  createOrder(userId: string, order: InsertOrder): Promise<Order>;
  updateOrder(id: string, userId: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string, userId: string): Promise<boolean>;

  // Dashboard statistics
  getDashboardStats(userId: string, startDate?: string, endDate?: string): Promise<{
    monthlyEarnings: number;
    monthlyOrders: number;
    completedReviews: number;
    pendingRefunds: number;
    totalInvestment: number;
    totalOrders: number;
    totalPendingRefund: number;
    pendingByBankAccount: Array<{
      bankAccountId: string;
      accountName: string;
      accountNumber: string;
      pendingAmount: number;
      orderCount: number;
    }>;
  }>;

  // Notification operations
  getNotifications(userId: string): Promise<NotificationWithOrder[]>;
  createNotification(userId: string, notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;

  // User Settings operations
  getUserSettings(userId: string): Promise<UserSettingsSelect | undefined>;
  upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettingsSelect>;

  // Activity Log operations
  createActivityLog(userId: string, log: InsertActivityLog): Promise<ActivityLog>;
  getOrderActivityLogs(orderId: string, userId: string): Promise<ActivityLogWithOrder[]>;
  getAllActivityLogs(userId: string, filters?: {
    orderId?: string;
    activityType?: ActivityLog['activityType'];
    limit?: number;
  }): Promise<ActivityLogWithOrder[]>;
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

  // Mediator operations
  async getMediators(userId: string): Promise<Mediator[]> {
    return await db
      .select()
      .from(mediators)
      .where(eq(mediators.userId, userId))
      .orderBy(asc(mediators.name));
  }

  async getMediator(id: string): Promise<Mediator | undefined> {
    const [mediator] = await db
      .select()
      .from(mediators)
      .where(eq(mediators.id, id))
      .limit(1);
    return mediator;
  }

  async createMediator(userId: string, mediator: InsertMediator): Promise<Mediator> {
    const [newMediator] = await db
      .insert(mediators)
      .values({ ...mediator, userId })
      .returning();
    return newMediator;
  }

  async updateMediator(id: string, userId: string, mediator: Partial<InsertMediator>): Promise<Mediator | undefined> {
    const [updatedMediator] = await db
      .update(mediators)
      .set({ ...mediator, updatedAt: new Date() })
      .where(and(eq(mediators.id, id), eq(mediators.userId, userId)))
      .returning();
    return updatedMediator;
  }

  async deleteMediator(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(mediators)
      .where(and(eq(mediators.id, id), eq(mediators.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Account operations
  async getAccounts(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.platform), asc(accounts.name));
  }

  async getAccountsByPlatform(userId: string, platform: Account['platform']): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.platform, platform)))
      .orderBy(asc(accounts.name));
  }

  async createAccount(userId: string, account: InsertAccount): Promise<Account> {
    const [newAccount] = await db
      .insert(accounts)
      .values({ ...account, userId })
      .returning();
    return newAccount;
  }

  async updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updatedAccount] = await db
      .update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Bank Account operations
  async getBankAccounts(userId: string): Promise<BankAccount[]> {
    return await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .orderBy(asc(bankAccounts.accountName));
  }

  async getActiveBankAccounts(userId: string): Promise<BankAccount[]> {
    return await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .orderBy(asc(bankAccounts.accountName));
  }

  async createBankAccount(userId: string, bankAccount: InsertBankAccount): Promise<BankAccount> {
    const [newBankAccount] = await db
      .insert(bankAccounts)
      .values({ ...bankAccount, userId })
      .returning();
    return newBankAccount;
  }

  async updateBankAccount(id: string, userId: string, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updatedBankAccount] = await db
      .update(bankAccounts)
      .set({ ...bankAccount, updatedAt: new Date() })
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)))
      .returning();
    return updatedBankAccount;
  }

  async deleteBankAccount(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(bankAccounts)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Order operations
  async getOrders(userId: string, filters?: {
    status?: Order['currentStatus'];
    mediatorId?: string;
    platform?: Order['platform'];
    accountId?: string;
  }): Promise<OrderWithRelations[]> {
    let query = db
      .select({
        id: orders.id,
        userId: orders.userId,
        mediatorId: orders.mediatorId,
        accountId: orders.accountId,
        bankAccountId: orders.bankAccountId,
        productName: orders.productName,
        platform: orders.platform,
        orderId: orders.orderId,
        orderAmount: orders.orderAmount,
        refundAmount: orders.refundAmount,
        productLink: orders.productLink,
        orderDate: orders.orderDate,
        deliveryDate: orders.deliveryDate,
        refundFormDate: orders.refundFormDate,
        remindRefundDate: orders.remindRefundDate,
        refundFormLink: orders.refundFormLink,
        comments: orders.comments,
        currentStatus: orders.currentStatus,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        mediator: {
          id: mediators.id,
          userId: mediators.userId,
          name: mediators.name,
          whatsappNumber: mediators.whatsappNumber,
          createdAt: mediators.createdAt,
          updatedAt: mediators.updatedAt,
        },
        account: {
          id: accounts.id,
          userId: accounts.userId,
          name: accounts.name,
          platform: accounts.platform,
          email: accounts.email,
          phone: accounts.phone,
          password: accounts.password,
          comments: accounts.comments,
          createdAt: accounts.createdAt,
          updatedAt: accounts.updatedAt,
        },
        bankAccount: {
          id: bankAccounts.id,
          userId: bankAccounts.userId,
          accountName: bankAccounts.accountName,
          accountNumber: bankAccounts.accountNumber,
          createdAt: bankAccounts.createdAt,
          updatedAt: bankAccounts.updatedAt,
        },
      })
      .from(orders)
      .leftJoin(mediators, eq(orders.mediatorId, mediators.id))
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .leftJoin(bankAccounts, eq(orders.bankAccountId, bankAccounts.id));

    const conditions = [eq(orders.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(orders.currentStatus, filters.status));
    }
    if (filters?.mediatorId) {
      conditions.push(eq(orders.mediatorId, filters.mediatorId));
    }
    if (filters?.platform) {
      conditions.push(eq(orders.platform, filters.platform));
    }
    if (filters?.accountId) {
      conditions.push(eq(orders.accountId, filters.accountId));
    }

    query = query.where(and(...conditions));

    const result = await query.orderBy(desc(orders.createdAt));

    return result.map(row => ({
      ...row,
      mediator: row.mediator!,
      account: row.account!,
    }));
  }

  async getOrder(id: string, userId: string): Promise<OrderWithRelations | undefined> {
    const [result] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        mediatorId: orders.mediatorId,
        accountId: orders.accountId,
        productName: orders.productName,
        platform: orders.platform,
        orderId: orders.orderId,
        orderAmount: orders.orderAmount,
        refundAmount: orders.refundAmount,
        productLink: orders.productLink,
        orderDate: orders.orderDate,
        deliveryDate: orders.deliveryDate,
        refundFormDate: orders.refundFormDate,
        remindRefundDate: orders.remindRefundDate,
        refundFormLink: orders.refundFormLink,
        comments: orders.comments,
        currentStatus: orders.currentStatus,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        mediator: {
          id: mediators.id,
          userId: mediators.userId,
          name: mediators.name,
          whatsappNumber: mediators.whatsappNumber,
          createdAt: mediators.createdAt,
          updatedAt: mediators.updatedAt,
        },
        account: {
          id: accounts.id,
          userId: accounts.userId,
          name: accounts.name,
          platform: accounts.platform,
          email: accounts.email,
          phone: accounts.phone,
          password: accounts.password,
          comments: accounts.comments,
          createdAt: accounts.createdAt,
          updatedAt: accounts.updatedAt,
        },
      })
      .from(orders)
      .leftJoin(mediators, eq(orders.mediatorId, mediators.id))
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .where(and(eq(orders.id, id), eq(orders.userId, userId)));

    if (!result) return undefined;

    return {
      ...result,
      mediator: result.mediator!,
      account: result.account!,
    };
  }

  async createOrder(userId: string, order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, userId })
      .returning();
    return newOrder;
  }

  async updateOrder(id: string, userId: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Dashboard statistics
  async getDashboardStats(userId: string, startDate?: string, endDate?: string): Promise<{
    monthlyEarnings: number;
    monthlyOrders: number;
    completedReviews: number;
    pendingRefunds: number;
    totalInvestment: number;
    totalOrders: number;
    totalPendingRefund: number;
    pendingByBankAccount: Array<{
      bankAccountId: string;
      accountName: string;
      accountNumber: string;
      pendingAmount: number;
      orderCount: number;
    }>;
  }> {
    const now = new Date();

    // Parse the start and end dates from query params, or use defaults
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Earnings in date range (only count orders created in this period that are refunded)
    const monthlyEarningsResult = await db
      .select({
        earnings: sql<number>`COALESCE(SUM(${orders.refundAmount} - ${orders.orderAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.currentStatus, "Refunded"),
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Orders count in date range (only orders created in this period)
    const monthlyOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Completed reviews in date range (only orders created in this period)
    const completedReviewsResult = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.currentStatus} IN ('Refund Form Done', 'Refunded')`,
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Pending refunds amount (only orders created in this period that are not refunded/cancelled)
    const pendingRefundsResult = await db
      .select({
        amount: sql<number>`COALESCE(SUM(${orders.refundAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.currentStatus} NOT IN ('Refunded', 'Cancelled')`,
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Total investment
    const totalInvestmentResult = await db
      .select({
        amount: sql<number>`COALESCE(SUM(${orders.orderAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Total orders count
    const totalOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      );

    // Pending refunds grouped by bank account (only orders created in this period)
    const pendingByBankAccountResult = await db
      .select({
        bankAccountId: orders.bankAccountId,
        accountName: bankAccounts.accountName,
        accountNumber: bankAccounts.accountNumber,
        pendingAmount: sql<number>`COALESCE(SUM(${orders.refundAmount}), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .innerJoin(bankAccounts, eq(orders.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(orders.userId, userId),
          isNotNull(orders.bankAccountId),
          sql`${orders.currentStatus} NOT IN ('Refunded', 'Cancelled')`,
          sql`${orders.createdAt} >= ${start}`,
          sql`${orders.createdAt} <= ${end}`
        )
      )
      .groupBy(orders.bankAccountId, bankAccounts.id, bankAccounts.accountName, bankAccounts.accountNumber);

    return {
      monthlyEarnings: monthlyEarningsResult[0]?.earnings || 0,
      monthlyOrders: monthlyOrdersResult[0]?.count || 0,
      completedReviews: completedReviewsResult[0]?.count || 0,
      pendingRefunds: pendingRefundsResult[0]?.amount || 0,
      totalInvestment: totalInvestmentResult[0]?.amount || 0,
      totalOrders: totalOrdersResult[0]?.count || 0,
      totalPendingRefund: pendingRefundsResult[0]?.amount || 0,
      pendingByBankAccount: pendingByBankAccountResult,
    };
  }

  // Get date-wise stats for a given month
  async getDateWiseStats(userId: string, year: number, month: number): Promise<{
    date: string;
    orderCount: number;
    refundedCount: number;
    earnings: number;
    investment: number;
  }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        orderCount: count(),
        refundedCount: sql<number>`SUM(CASE WHEN ${orders.currentStatus} = 'Refunded' THEN 1 ELSE 0 END)`,
        earnings: sql<number>`COALESCE(SUM(CASE WHEN ${orders.currentStatus} = 'Refunded' THEN ${orders.refundAmount} - ${orders.orderAmount} ELSE 0 END), 0)`,
        investment: sql<number>`COALESCE(SUM(${orders.orderAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.createdAt} >= ${startDate}`,
          sql`${orders.createdAt} <= ${endDate}`
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    return result.map(row => ({
      date: row.date,
      orderCount: Number(row.orderCount),
      refundedCount: Number(row.refundedCount),
      earnings: Number(row.earnings),
      investment: Number(row.investment),
    }));
  }

  // Get month-wise stats for a given year
  async getMonthWiseStats(userId: string, year: number): Promise<{
    month: number;
    monthName: string;
    orderCount: number;
    refundedCount: number;
    earnings: number;
    investment: number;
  }[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const result = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${orders.createdAt})`,
        orderCount: count(),
        refundedCount: sql<number>`SUM(CASE WHEN ${orders.currentStatus} = 'Refunded' THEN 1 ELSE 0 END)`,
        earnings: sql<number>`COALESCE(SUM(CASE WHEN ${orders.currentStatus} = 'Refunded' THEN ${orders.refundAmount} - ${orders.orderAmount} ELSE 0 END), 0)`,
        investment: sql<number>`COALESCE(SUM(${orders.orderAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.createdAt} >= ${startDate}`,
          sql`${orders.createdAt} <= ${endDate}`
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return result.map(row => ({
      month: Number(row.month),
      monthName: monthNames[Number(row.month) - 1] || '',
      orderCount: Number(row.orderCount),
      refundedCount: Number(row.refundedCount),
      earnings: Number(row.earnings),
      investment: Number(row.investment),
    }));
  }

  // Notification operations
  async getNotifications(userId: string): Promise<NotificationWithOrder[]> {
    const result = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        orderId: notifications.orderId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        order: {
          id: orders.id,
          userId: orders.userId,
          mediatorId: orders.mediatorId,
          accountId: orders.accountId,
          productName: orders.productName,
          platform: orders.platform,
          orderId: orders.orderId,
          orderAmount: orders.orderAmount,
          refundAmount: orders.refundAmount,
          productLink: orders.productLink,
          orderDate: orders.orderDate,
          deliveryDate: orders.deliveryDate,
          refundFormDate: orders.refundFormDate,
          remindRefundDate: orders.remindRefundDate,
          refundFormLink: orders.refundFormLink,
          comments: orders.comments,
          currentStatus: orders.currentStatus,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        },
      })
      .from(notifications)
      .leftJoin(orders, eq(notifications.orderId, orders.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return result.map(row => ({
      ...row,
      order: row.order || undefined,
    }));
  }

  async createNotification(userId: string, notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({ ...notification, userId })
      .returning();
    return newNotification;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // User Settings operations
  async getUserSettings(userId: string): Promise<UserSettingsSelect | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return settings;
  }

  async upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettingsSelect> {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId,
          calendarEnabled: settings.calendarEnabled ?? 1,
          googleAccessToken: settings.googleAccessToken ?? null,
          googleRefreshToken: settings.googleRefreshToken ?? null,
          googleTokenExpiry: settings.googleTokenExpiry ?? null,
          calendarId: settings.calendarId ?? null,
          messagingEnabled: settings.messagingEnabled ?? 1,
          messageTemplates: settings.messageTemplates ?? null,
        })
        .returning();
      return newSettings;
    }
  }

  // Activity Log operations
  async createActivityLog(userId: string, log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values({ ...log, userId })
      .returning();
    return newLog;
  }

  async getOrderActivityLogs(orderId: string, userId: string): Promise<ActivityLogWithOrder[]> {
    const result = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        orderId: activityLogs.orderId,
        activityType: activityLogs.activityType,
        description: activityLogs.description,
        oldValue: activityLogs.oldValue,
        newValue: activityLogs.newValue,
        triggeredBy: activityLogs.triggeredBy,
        createdAt: activityLogs.createdAt,
        order: {
          id: orders.id,
          userId: orders.userId,
          mediatorId: orders.mediatorId,
          accountId: orders.accountId,
          productName: orders.productName,
          platform: orders.platform,
          orderId: orders.orderId,
          orderAmount: orders.orderAmount,
          refundAmount: orders.refundAmount,
          productLink: orders.productLink,
          orderDate: orders.orderDate,
          deliveryDate: orders.deliveryDate,
          refundFormDate: orders.refundFormDate,
          remindRefundDate: orders.remindRefundDate,
          refundFormLink: orders.refundFormLink,
          comments: orders.comments,
          currentStatus: orders.currentStatus,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        },
      })
      .from(activityLogs)
      .leftJoin(orders, eq(activityLogs.orderId, orders.id))
      .where(and(eq(activityLogs.orderId, orderId), eq(activityLogs.userId, userId)))
      .orderBy(desc(activityLogs.createdAt));

    return result.map(row => ({
      ...row,
      order: row.order || undefined,
    }));
  }

  async getAllActivityLogs(userId: string, filters?: {
    orderId?: string;
    activityType?: ActivityLog['activityType'];
    limit?: number;
  }): Promise<ActivityLogWithOrder[]> {
    let query = db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        orderId: activityLogs.orderId,
        activityType: activityLogs.activityType,
        description: activityLogs.description,
        oldValue: activityLogs.oldValue,
        newValue: activityLogs.newValue,
        triggeredBy: activityLogs.triggeredBy,
        createdAt: activityLogs.createdAt,
        order: {
          id: orders.id,
          userId: orders.userId,
          mediatorId: orders.mediatorId,
          accountId: orders.accountId,
          productName: orders.productName,
          platform: orders.platform,
          orderId: orders.orderId,
          orderAmount: orders.orderAmount,
          refundAmount: orders.refundAmount,
          productLink: orders.productLink,
          orderDate: orders.orderDate,
          deliveryDate: orders.deliveryDate,
          refundFormDate: orders.refundFormDate,
          remindRefundDate: orders.remindRefundDate,
          refundFormLink: orders.refundFormLink,
          comments: orders.comments,
          currentStatus: orders.currentStatus,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        },
      })
      .from(activityLogs)
      .leftJoin(orders, eq(activityLogs.orderId, orders.id));

    const conditions = [eq(activityLogs.userId, userId)];
    
    if (filters?.orderId) {
      conditions.push(eq(activityLogs.orderId, filters.orderId));
    }
    if (filters?.activityType) {
      conditions.push(eq(activityLogs.activityType, filters.activityType));
    }
    
    query = query.where(and(...conditions));
    query = query.orderBy(desc(activityLogs.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const result = await query;
    
    return result.map(row => ({
      ...row,
      order: row.order || undefined,
    }));
  }
}

export const storage = new DatabaseStorage();
