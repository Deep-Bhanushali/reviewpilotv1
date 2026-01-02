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

// Reminder category enum
export const reminderCategoryEnum = pgEnum("reminder_category", [
  "General",
  "Delivery",
  "Review_Rating",
  "Refund_Form",
  "Mediator_Payment"
]);

// Activity type enum
export const activityTypeEnum = pgEnum("activity_type", [
  "Order Created",
  "Status Changed",
  "Order Updated",
  "Dates Modified",
  "Calendar Event Created",
  "Calendar Event Updated",
  "Calendar Event Deleted"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  password: text("password"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank Accounts table
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountName: varchar("account_name").notNull(),
  accountNumber: varchar("account_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediatorId: varchar("mediator_id").notNull().references(() => mediators.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  productName: varchar("product_name").notNull(),
  platform: platformEnum("platform").notNull(),
  orderId: varchar("order_id").notNull(),
  orderAmount: integer("order_amount").notNull(),
  refundAmount: integer("refund_amount").notNull(),
  productLink: text("product_link"),
  orderDate: timestamp("order_date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  refundFormDate: timestamp("refund_form_date"),
  remindRefundDate: timestamp("remind_refund_date"),
  refundFormLink: text("refund_form_link"),
  comments: text("comments"),
  currentStatus: orderStatusEnum("current_status").notNull().default("Ordered"),
  calendarEventIds: text("calendar_event_ids"),
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
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  activityType: activityTypeEnum("activity_type").notNull(),
  description: text("description").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  triggeredBy: varchar("triggered_by").notNull().default("User"),
  createdAt: timestamp("created_at").defaultNow(),
});
