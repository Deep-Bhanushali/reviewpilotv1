import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform enum
export const platformEnum = pgEnum("platform", [
  "Amazon",
  "Flipkart", 
  "Myntra",
  "Meesho",
  "Ajio",
  "Nykaa",
  "Paytm Mall",
  "Snapdeal"
]);

// Order status enum
export const orderStatusEnum = pgEnum("order_status", [
  "Ordered",
  "Delivered", 
  "Deliverables Done",
  "Refund Form Done",
  "Overdue Passed for Refund Form",
  "Remind Mediator for Payment",
  "Refunded",
  "Cancelled"
]);

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "Critical",
  "Warning",
  "Success", 
  "Info"
]);

// Reminder category enum - for specific reminder types
export const reminderCategoryEnum = pgEnum("reminder_category", [
  "General",
  "Delivery",
  "Review_Rating",
  "Refund_Form",
  "Mediator_Payment"
]);

// Activity type enum - for tracking order changes
export const activityTypeEnum = pgEnum("activity_type", [
  "Order Created",
  "Status Changed",
  "Order Updated",
  "Dates Modified",
  "Calendar Event Created",
  "Calendar Event Updated",
  "Calendar Event Deleted"
]);

// Mediators table
export const mediators = pgTable("mediators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  whatsappNumber: varchar("whatsapp_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  platform: platformEnum("platform").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  password: text("password"), // encrypted
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank Accounts table
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountName: varchar("account_name").notNull(), // Name for the account (e.g., "HDFC Savings", "ICICI Current")
  accountNumber: varchar("account_number").notNull(), // Bank account number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediatorId: varchar("mediator_id").notNull().references(() => mediators.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id), // Bank account for refund
  productName: varchar("product_name").notNull(),
  platform: platformEnum("platform").notNull(),
  orderId: varchar("order_id").notNull(),
  orderAmount: integer("order_amount").notNull(), // in paise
  refundAmount: integer("refund_amount").notNull(), // in paise  
  productLink: text("product_link"),
  orderDate: timestamp("order_date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  refundFormDate: timestamp("refund_form_date"),
  remindRefundDate: timestamp("remind_refund_date"),
  refundFormLink: text("refund_form_link"),
  comments: text("comments"),
  currentStatus: orderStatusEnum("current_status").notNull().default("Ordered"),
  calendarEventIds: text("calendar_event_ids"), // JSON array of Google Calendar event IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Settings table for user preferences
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  calendarEnabled: integer("calendar_enabled").notNull().default(1), // 0 = false, 1 = true
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  calendarId: text("calendar_id"),
  messagingEnabled: integer("messaging_enabled").notNull().default(1),
  messageTemplates: text("message_templates"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  reminderCategory: reminderCategoryEnum("reminder_category").notNull().default("General"),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read").notNull().default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs table - tracks all order changes
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  activityType: activityTypeEnum("activity_type").notNull(),
  description: text("description").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  triggeredBy: varchar("triggered_by").notNull().default("User"), // User or System
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many, one }) => ({
  mediators: many(mediators),
  accounts: many(accounts),
  bankAccounts: many(bankAccounts),
  orders: many(orders),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
  settings: one(userSettings),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const mediatorRelations = relations(mediators, ({ one, many }) => ({
  user: one(users, {
    fields: [mediators.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const accountRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const bankAccountRelations = relations(bankAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [bankAccounts.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  mediator: one(mediators, {
    fields: [orders.mediatorId],
    references: [mediators.id],
  }),
  account: one(accounts, {
    fields: [orders.accountId],
    references: [accounts.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [orders.bankAccountId],
    references: [bankAccounts.id],
  }),
  activityLogs: many(activityLogs),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [activityLogs.orderId],
    references: [orders.id],
  }),
}));

// Insert schemas
export const insertMediatorSchema = createInsertSchema(mediators).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  orderDate: z.string().transform((str) => new Date(str)),
  deliveryDate: z.string().transform((str) => new Date(str)).nullable().optional(),
  refundFormDate: z.string().transform((str) => new Date(str)).nullable().optional(),
  remindRefundDate: z.string().transform((str) => new Date(str)).nullable().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertMediator = z.infer<typeof insertMediatorSchema>;
export type Mediator = typeof mediators.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettingsSelect = typeof userSettings.$inferSelect;

// Extended types with relations
export type OrderWithRelations = Order & {
  mediator: Mediator;
  account: Account;
  bankAccount?: BankAccount;
};

export type NotificationWithOrder = Notification & {
  order?: OrderWithRelations;
};

export type ActivityLogWithOrder = ActivityLog & {
  order?: Order;
};
