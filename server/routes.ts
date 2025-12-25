import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import path from "path";
import {
  insertMediatorSchema,
  insertAccountSchema,
  insertBankAccountSchema,
  insertOrderSchema,
  insertNotificationSchema,
  insertUserSettingsSchema
} from "@shared/schema";
import { googleCalendarService } from "./google-calendar";
import { generateICSFile, createOrderCalendarEvents } from "./calendar-export";
import { syncOrderToCalendar } from "./calendar-sync";
import { cronJobService } from "./cron-jobs";
import { z } from "zod";
import type { Order } from "@shared/schema";

// Helper function to create notifications based on order events
async function createOrderNotifications(userId: string, order: Order, event: 'created' | 'status_changed', oldStatus?: string) {
  try {
    // Order created notification
    if (event === 'created') {
      await storage.createNotification(userId, {
        orderId: order.id,
        type: "Info",
        reminderCategory: "General",
        title: "New Order Created",
        message: `Order for ${order.productName} on ${order.platform} has been created successfully`
      });
      return;
    }

    // Status change notifications
    if (event === 'status_changed' && order.currentStatus) {
      const status = order.currentStatus;

      // Critical: Overdue refund form
      if (status === "Overdue Passed for Refund Form") {
        await storage.createNotification(userId, {
          orderId: order.id,
          type: "Critical",
          reminderCategory: "Refund_Form",
          title: "Overdue Refund Form",
          message: `Refund form deadline has passed for ${order.productName}. Submit immediately!`
        });
      }

      // Critical: Delivered (waiting for review)
      if (status === "Delivered") {
        await storage.createNotification(userId, {
          orderId: order.id,
          type: "Warning",
          reminderCategory: "Review_Rating",
          title: "Product Delivered",
          message: `${order.productName} has been delivered. Remember to complete the review within 3 days.`
        });
      }

      // Info: Remind mediator for payment
      if (status === "Remind Mediator for Payment") {
        await storage.createNotification(userId, {
          orderId: order.id,
          type: "Info",
          reminderCategory: "Mediator_Payment",
          title: "Follow Up with Mediator",
          message: `Time to contact mediator for payment regarding ${order.productName}`
        });
      }

      // Success: Refunded
      if (status === "Refunded") {
        await storage.createNotification(userId, {
          orderId: order.id,
          type: "Success",
          reminderCategory: "Mediator_Payment",
          title: "Refund Received",
          message: `Refund for ${order.productName} has been received successfully`
        });
      }
    }
  } catch (error) {
    console.error("Error creating order notification:", error);
    // Don't throw - notification creation should not block order operations
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve CSV template file before other routes
  app.get('/order-import-template.csv', async (req, res) => {
    try {
      // Check if user is authenticated to generate personalized template
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        const userId = (req.user as any).claims.sub;
        
        // Get user's accounts and mediators
        const userAccounts = await storage.getAccounts(userId);
        const userMediators = await storage.getMediators(userId);
        
        if (userAccounts.length > 0 && userMediators.length > 0) {
          // Generate personalized template with actual IDs
          const csvHeaders = 'Product Name,Platform,Account ID,Order ID,Order Amount,Refund Amount,Product Link,Mediator ID,Order Date,Delivery Date,Refund Form Date,Remind Refund Date,Status';
          
          const sampleRows = [
            `Sample iPhone Case,Amazon,${userAccounts[0].id},ORD123456,1500,1500,https://amazon.in/product,${userMediators[0].id},2024-01-15,2024-01-18,2024-01-25,2024-01-30,Ordered`,
            userAccounts.length > 1 && userMediators.length > 1 
              ? `Sample Headphones,Flipkart,${userAccounts[Math.min(1, userAccounts.length - 1)].id},ORD789012,2500,2500,https://flipkart.com/headphones,${userMediators[Math.min(1, userMediators.length - 1)].id},2024-01-20,2024-01-23,2024-01-28,2024-02-02,Delivered`
              : null
          ].filter(Boolean);
          
          const csvContent = [csvHeaders, ...sampleRows].join('\n');
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="order-import-template.csv"');
          return res.send(csvContent);
        }
      }
      
      // Fallback to static template file
      const templatePath = path.resolve(import.meta.dirname, "..", "public", "order-import-template.csv");
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="order-import-template.csv"');
      res.sendFile(templatePath);
    } catch (error) {
      console.error("Error generating template:", error);
      // Fallback to static template
      const templatePath = path.resolve(import.meta.dirname, "..", "public", "order-import-template.csv");
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="order-import-template.csv"');
      res.sendFile(templatePath);
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Google Calendar OAuth routes
  app.get('/api/calendar/auth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authUrl = googleCalendarService.getAuthUrl(userId, req);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting auth URL:", error);
      res.status(500).json({ message: "Failed to get calendar auth URL" });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send('Missing authorization code or state');
      }

      // Exchange code for tokens
      const tokens = await googleCalendarService.exchangeCodeForTokens(code as string);
      
      // Update user settings with tokens
      await storage.upsertUserSettings(state as string, {
        googleAccessToken: tokens.access_token!,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarEnabled: 1
      });

      // Redirect to settings page with success
      res.redirect('/?calendar=connected');
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.redirect('/?calendar=error');
    }
  });

  // Calendar event creation endpoint
  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, startDateTime, endDateTime, orderId } = req.body;
      
      // Get user settings with tokens
      const settings = await storage.getUserSettings(userId);
      if (!settings?.googleAccessToken) {
        return res.status(400).json({ message: 'Google Calendar not connected' });
      }

      // Create calendar event
      const event = await googleCalendarService.createCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        {
          title,
          description,
          startDateTime: new Date(startDateTime),
          endDateTime: new Date(endDateTime),
          calendarId: settings.calendarId || 'primary'
        }
      );

      res.json({ event, success: true });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ message: 'Failed to create calendar event' });
    }
  });

  // Test calendar connection
  app.get('/api/calendar/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user settings with tokens
      const settings = await storage.getUserSettings(userId);
      if (!settings?.googleAccessToken) {
        return res.status(400).json({ 
          connected: false, 
          message: 'Google Calendar not connected. Please connect your account first.' 
        });
      }

      // Try to fetch calendar list to verify connection
      try {
        await googleCalendarService.testConnection(
          settings.googleAccessToken,
          settings.googleRefreshToken!
        );

        res.json({
          connected: true,
          message: 'Google Calendar is connected and working properly!'
        });
      } catch (error: any) {
        // Check if it's an invalid_grant error (expired/revoked token)
        if (error.code === 400 || error.message?.includes('invalid_grant')) {
          // Clear the invalid tokens
          await storage.upsertUserSettings(userId, {
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiry: null
          });

          return res.status(400).json({
            connected: false,
            message: 'Your Google Calendar authorization has expired. Please reconnect your account.',
            requiresReauth: true
          });
        }

        res.status(400).json({
          connected: false,
          message: 'Connection failed. Please reconnect your Google Calendar.'
        });
      }
    } catch (error) {
      console.error('Error testing calendar connection:', error);
      res.status(500).json({ 
        connected: false, 
        message: 'Failed to test calendar connection' 
      });
    }
  });

  // Download calendar events as ICS file
  app.get('/api/calendar/export/:orderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      
      // Get the order
      const order = await storage.getOrder(orderId, userId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Create calendar events for this order
      const events = createOrderCalendarEvents(order);
      
      if (events.length === 0) {
        return res.status(400).json({ message: 'No calendar events available for this order (missing delivery or refund dates)' });
      }

      // Generate ICS file
      const icsContent = generateICSFile(events);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${order.productName.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`);
      res.send(icsContent);
    } catch (error) {
      console.error('Error generating calendar file:', error);
      res.status(500).json({ message: 'Failed to generate calendar file' });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.start as string;
      const endDate = req.query.end as string;

      // If no dates provided, show stats for all time
      if (!startDate || !endDate) {
        const stats = await storage.getDashboardStats(userId, '1970-01-01', '2099-12-31');
        res.json(stats);
        return;
      }

      const stats = await storage.getDashboardStats(userId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/stats/date-wise", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const stats = await storage.getDateWiseStats(userId, year, month);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching date-wise stats:", error);
      res.status(500).json({ message: "Failed to fetch date-wise stats" });
    }
  });

  app.get("/api/dashboard/stats/month-wise", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const stats = await storage.getMonthWiseStats(userId, year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching month-wise stats:", error);
      res.status(500).json({ message: "Failed to fetch month-wise stats" });
    }
  });

  // Mediator routes
  app.get("/api/mediators", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mediators = await storage.getMediators(userId);
      res.json(mediators);
    } catch (error) {
      console.error("Error fetching mediators:", error);
      res.status(500).json({ message: "Failed to fetch mediators" });
    }
  });

  app.post("/api/mediators", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mediatorData = insertMediatorSchema.parse(req.body);
      const mediator = await storage.createMediator(userId, mediatorData);
      res.status(201).json(mediator);
    } catch (error) {
      console.error("Error creating mediator:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mediator data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mediator" });
    }
  });

  app.put("/api/mediators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const mediatorData = insertMediatorSchema.partial().parse(req.body);
      const mediator = await storage.updateMediator(id, userId, mediatorData);
      if (!mediator) {
        return res.status(404).json({ message: "Mediator not found" });
      }
      res.json(mediator);
    } catch (error) {
      console.error("Error updating mediator:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mediator data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update mediator" });
    }
  });

  app.delete("/api/mediators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteMediator(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Mediator not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mediator:", error);
      res.status(500).json({ message: "Failed to delete mediator" });
    }
  });

  // Account routes
  app.get("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { platform } = req.query;
      
      let accounts;
      if (platform) {
        // Validate platform is one of the allowed enum values
        const validPlatforms = ["Amazon", "Flipkart", "Myntra", "Meesho", "Ajio", "Nykaa", "Paytm Mall", "Snapdeal"];
        if (!validPlatforms.includes(platform as string)) {
          return res.status(400).json({ message: "Invalid platform parameter" });
        }
        accounts = await storage.getAccountsByPlatform(userId, platform as any);
      } else {
        accounts = await storage.getAccounts(userId);
      }
      
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(userId, accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const accountData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, userId, accountData);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteAccount(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Bank Accounts Routes
  app.get("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { active } = req.query;

      let bankAccounts;
      if (active === 'true') {
        bankAccounts = await storage.getActiveBankAccounts(userId);
      } else {
        bankAccounts = await storage.getBankAccounts(userId);
      }

      res.json(bankAccounts);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
  });

  app.post("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bankAccountData = insertBankAccountSchema.parse(req.body);
      const bankAccount = await storage.createBankAccount(userId, bankAccountData);
      res.status(201).json(bankAccount);
    } catch (error) {
      console.error("Error creating bank account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bank account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bank account" });
    }
  });

  app.put("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const bankAccountData = insertBankAccountSchema.partial().parse(req.body);
      const bankAccount = await storage.updateBankAccount(id, userId, bankAccountData);
      if (!bankAccount) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      res.json(bankAccount);
    } catch (error) {
      console.error("Error updating bank account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bank account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bank account" });
    }
  });

  app.delete("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteBankAccount(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bank account:", error);
      res.status(500).json({ message: "Failed to delete bank account" });
    }
  });

  // Order routes
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, mediatorId, platform, accountId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (mediatorId) filters.mediatorId = mediatorId;
      if (platform) filters.platform = platform;
      if (accountId) filters.accountId = accountId;
      
      const orders = await storage.getOrders(userId, filters);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const order = await storage.getOrder(id, userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(userId, orderData);
      
      // Log order creation
      await storage.createActivityLog(userId, {
        orderId: order.id,
        activityType: "Order Created",
        description: `Order created for ${order.productName} on ${order.platform}`,
        newValue: JSON.stringify({
          status: order.currentStatus,
          orderAmount: order.orderAmount,
          refundAmount: order.refundAmount
        }),
        triggeredBy: "User"
      });
      
      // Create notification for new order
      await createOrderNotifications(userId, order, 'created');
      
      // Sync to Google Calendar if enabled
      await syncOrderToCalendar(userId, order, "create");
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const orderData = insertOrderSchema.partial().parse(req.body);
      
      // Get existing order to compare changes
      const existingOrder = await storage.getOrder(id, userId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const order = await storage.updateOrder(id, userId, orderData);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Track what changed and create appropriate activity logs
      const changes = [];
      
      // Check for status change
      if (orderData.currentStatus && orderData.currentStatus !== existingOrder.currentStatus) {
        await storage.createActivityLog(userId, {
          orderId: order.id,
          activityType: "Status Changed",
          description: `Order status changed from "${existingOrder.currentStatus}" to "${orderData.currentStatus}"`,
          oldValue: existingOrder.currentStatus,
          newValue: orderData.currentStatus,
          triggeredBy: "User"
        });
        
        // Create notification for status change
        await createOrderNotifications(userId, order, 'status_changed', existingOrder.currentStatus);
        
        changes.push('status');
      }
      
      // Check for date changes
      const dateFields = [
        { key: 'deliveryDate', label: 'Delivery Date' },
        { key: 'refundFormDate', label: 'Refund Form Date' },
        { key: 'remindRefundDate', label: 'Remind Refund Date' }
      ];
      
      for (const field of dateFields) {
        if ((orderData as any)[field.key] && (orderData as any)[field.key] !== (existingOrder as any)[field.key]) {
          await storage.createActivityLog(userId, {
            orderId: order.id,
            activityType: "Dates Modified",
            description: `${field.label} updated`,
            oldValue: (existingOrder as any)[field.key]?.toString() || 'Not set',
            newValue: (orderData as any)[field.key].toString(),
            triggeredBy: "User"
          });
          changes.push(field.key);
        }
      }
      
      // Log general order update if there are other changes
      const otherChanges = Object.keys(orderData).filter(
        key => !['currentStatus', 'deliveryDate', 'refundFormDate', 'remindRefundDate'].includes(key)
      );
      
      if (otherChanges.length > 0 && changes.length === 0) {
        await storage.createActivityLog(userId, {
          orderId: order.id,
          activityType: "Order Updated",
          description: `Order details updated: ${otherChanges.join(', ')}`,
          oldValue: JSON.stringify(Object.fromEntries(otherChanges.map(k => [k, (existingOrder as any)[k]]))),
          newValue: JSON.stringify(Object.fromEntries(otherChanges.map(k => [k, (orderData as any)[k]]))),
          triggeredBy: "User"
        });
      }
      
      // Sync to Google Calendar if delivery/refund dates changed
      if (orderData.deliveryDate || orderData.refundFormDate) {
        await syncOrderToCalendar(userId, order, "update");
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Get order before deleting for calendar cleanup
      const order = await storage.getOrder(id, userId);
      
      const deleted = await storage.deleteOrder(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Remove calendar events if order existed
      if (order) {
        await syncOrderToCalendar(userId, order, "delete");
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(userId, notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Manual trigger for cron jobs (for testing/debugging)
  app.post("/api/cron/trigger", isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.body; // 'hourly' | 'daily' | 'all'

      if (type === 'hourly' || type === 'all') {
        // This would trigger hourly checks - implement as needed
        return res.json({
          success: true,
          message: "Hourly checks triggered (manual)",
          timestamp: new Date().toISOString()
        });
      }

      if (type === 'daily' || type === 'all') {
        // This would trigger daily checks - implement as needed
        return res.json({
          success: true,
          message: "Daily checks triggered (manual)",
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: "Cron job service is running automatically",
        schedule: {
          hourly: "Every hour at minute 0",
          daily: "Every day at 9:00 AM",
          timezone: process.env.TZ || "Asia/Kolkata"
        }
      });
    } catch (error) {
      console.error("Error triggering cron job:", error);
      res.status(500).json({ message: "Failed to trigger cron job" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const marked = await storage.markNotificationRead(id, userId);
      if (!marked) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // User Settings routes
  app.get("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          calendarEnabled: 1,
          calendarApiKey: null,
          calendarId: null,
          messagingEnabled: 1,
          messageTemplates: null,
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.put("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settingsData = insertUserSettingsSchema.partial().parse(req.body);
      const updatedSettings = await storage.upsertUserSettings(userId, settingsData);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Test messaging endpoint
  app.post("/api/messaging/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageType, template, mediatorId } = req.body;

      console.log('Test message requested:', {
        userId,
        messageType,
        template,
        mediatorId
      });

      // Get mediator details
      const mediator = await storage.getMediator(mediatorId);
      if (!mediator) {
        return res.status(404).json({ message: 'Mediator not found' });
      }

      // Format the test message
      const testMessage = `Test Message: This is a test from ReviewPilot using the "${template}" template. Mediator: ${mediator.name}`;

      console.log('Test message formatted:', testMessage);

      // TODO: Integrate with actual WhatsApp/Messaging service
      // For now, just log it and pretend it worked
      console.log('🎯 TEST MESSAGE SENT (MOCK):', {
        to: mediator.whatsappNumber || mediator.whatsappNumber,
        message: testMessage,
        template: template,
        from: 'ReviewPilot Testing',
      });

      // Simulate a short delay
      await new Promise(resolve => setTimeout(resolve, 500));

      res.json({
        success: true,
        message: 'Test message sent successfully!',
        details: {
          mediatorName: mediator.name,
          templateUsed: template,
          messagePreview: testMessage.substring(0, 100) + '...',
          sentVia: 'WhatsApp (simulated)'
        }
      });
    } catch (error) {
      console.error('Error sending test message:', error);
      res.status(500).json({ message: 'Failed to send test message' });
    }
  });

  // Export routes
  app.get("/api/export/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrders(userId);
      
      // Generate CSV content
      const csvHeaders = [
        'Product Name', 'Platform', 'Account Name', 'Order ID', 'Order Amount (₹)', 
        'Refund Amount (₹)', 'Product Link', 'Mediator Name', 'Order Date', 
        'Delivery Date', 'Refund Form Date', 'Remind Refund Date', 'Status'
      ].join(',');
      
      const csvRows = orders.map((order: any) => [
        `"${order.productName}"`,
        order.platform,
        `"${order.account?.name || ''}"`,
        order.orderId,
        (order.orderAmount / 100).toFixed(2), // Convert paise to rupees
        (order.refundAmount / 100).toFixed(2),
        order.productLink || '',
        `"${order.mediator?.name || ''}"`,
        order.orderDate?.toISOString().split('T')[0] || '',
        order.deliveryDate?.toISOString().split('T')[0] || '',
        order.refundFormDate?.toISOString().split('T')[0] || '',
        order.remindRefundDate?.toISOString().split('T')[0] || '',
        order.currentStatus
      ].join(','));
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });

  app.get("/api/export/mediators", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mediators = await storage.getMediators(userId);
      
      const csvHeaders = ['Name', 'Phone', 'WhatsApp', 'Platform', 'Created Date'].join(',');
      const csvRows = mediators.map((mediator: any) => [
        `"${mediator.name}"`,
        mediator.whatsappNumber || '',
        mediator.whatsappNumber || '',
        'All Platforms',
        mediator.createdAt?.toISOString().split('T')[0] || ''
      ].join(','));
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="mediators.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting mediators:", error);
      res.status(500).json({ message: "Failed to export mediators" });
    }
  });

  app.get("/api/export/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccounts(userId);
      
      const csvHeaders = ['Name', 'Platform', 'Username', 'Email', 'Phone', 'Created Date'].join(',');
      const csvRows = accounts.map((account: any) => [
        `"${account.name}"`,
        account.platform,
        account.email || '',
        account.email || '',
        account.phone || '',
        account.createdAt?.toISOString().split('T')[0] || ''
      ].join(','));
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="accounts.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting accounts:", error);
      res.status(500).json({ message: "Failed to export accounts" });
    }
  });

  // Import routes
  app.post("/api/import/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { csvData } = req.body;
      
      console.log("CSV Import request received:", {
        userId,
        dataLength: csvData?.length,
        sampleRow: csvData?.[0]
      });
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ 
          message: "Invalid CSV data",
          success: false,
          imported: 0,
          errors: 1,
          errorDetails: [{ row: 0, error: "CSV data is missing or invalid format" }]
        });
      }
      
      if (csvData.length === 0) {
        return res.status(400).json({ 
          message: "No data rows found",
          success: false,
          imported: 0,
          errors: 1,
          errorDetails: [{ row: 0, error: "CSV file contains no data rows" }]
        });
      }
      
      const importedOrders = [];
      const errors = [];

      // Get user's accounts, mediators, and bank accounts for validation
      const userAccounts = await storage.getAccounts(userId);
      const userMediators = await storage.getMediators(userId);
      const userBankAccounts = await storage.getBankAccounts(userId);

      console.log("User data:", {
        accountsCount: userAccounts.length,
        mediatorsCount: userMediators.length,
        bankAccountsCount: userBankAccounts.length,
        accountIds: userAccounts.map(a => a.id),
        mediatorIds: userMediators.map(m => m.id),
        bankAccountIds: userBankAccounts.map(b => b.id)
      });

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        console.log(`Processing row ${i + 1}:`, row);

        try {
          // Check if row has enough columns (now 14 with bank account name)
          if (!row || row.length < 14) {
            errors.push({
              row: i + 1,
              error: `Row has ${row?.length || 0} columns, expected 14. Missing: ${14 - (row?.length || 0)} columns.`
            });
            continue;
          }

          // Validate Account Name exists
          const accountName = row[2]?.trim();
          if (!accountName) {
            errors.push({ row: i + 1, error: "Account Name is required" });
            continue;
          }

          const accountExists = userAccounts.find(acc => acc.name === accountName);
          if (!accountExists) {
            errors.push({
              row: i + 1,
              error: `Account '${accountName}' not found. Please create this account first in the Accounts page.`
            });
            continue;
          }

          // Validate Mediator Name exists
          const mediatorName = row[7]?.trim();
          if (!mediatorName) {
            errors.push({ row: i + 1, error: "Mediator Name is required" });
            continue;
          }

          const mediatorExists = userMediators.find(med => med.name === mediatorName);
          if (!mediatorExists) {
            errors.push({
              row: i + 1,
              error: `Mediator '${mediatorName}' not found. Please create this mediator first in the Mediators page.`
            });
            continue;
          }

          // Validate Bank Account Name exists (optional)
          const bankAccountName = row[8]?.trim();
          let bankAccountId: string | undefined = undefined;

          if (bankAccountName) {
            const bankAccountExists = userBankAccounts.find(ba => ba.accountName === bankAccountName);
            if (!bankAccountExists) {
              errors.push({
                row: i + 1,
                error: `Bank Account '${bankAccountName}' not found. Please create this bank account first or leave blank.`
              });
              continue;
            }
            bankAccountId = bankAccountExists.id;
          }

          // Parse and validate amounts
          const orderAmount = parseFloat(row[4]);
          const refundAmount = parseFloat(row[5]);

          if (isNaN(orderAmount) || orderAmount <= 0) {
            errors.push({ row: i + 1, error: `Invalid order amount: ${row[4]}` });
            continue;
          }

          if (isNaN(refundAmount) || refundAmount < 0) {
            errors.push({ row: i + 1, error: `Invalid refund amount: ${row[5]}` });
            continue;
          }

          // Parse the CSV row data - use IDs from validated names
          const orderData = {
            productName: row[0]?.trim() || '',
            platform: row[1]?.trim() || 'Amazon',
            accountId: accountExists.id, // Use actual ID from found account
            orderId: row[3]?.trim() || '',
            orderAmount: Math.round(orderAmount * 100), // Convert to paise
            refundAmount: Math.round(refundAmount * 100),
            productLink: row[6]?.trim() || undefined,
            mediatorId: mediatorExists.id, // Use actual ID from found mediator
            bankAccountId: bankAccountId, // Use actual ID from found bank account (optional)
            orderDate: row[9]?.trim() || new Date().toISOString(),
            deliveryDate: row[10]?.trim() || undefined,
            refundFormDate: row[11]?.trim() || undefined,
            remindRefundDate: row[12]?.trim() || undefined,
            currentStatus: row[13]?.trim() || "Ordered"
          };
          
          console.log(`Parsed order data for row ${i + 1}:`, orderData);
          
          const validatedData = insertOrderSchema.parse(orderData);
          const order = await storage.createOrder(userId, validatedData);
          importedOrders.push(order);
          
          console.log(`Successfully imported order for row ${i + 1}:`, order.id);
          
        } catch (error: any) {
          console.error(`Error processing row ${i + 1}:`, error);
          
          let errorMessage = 'Unknown validation error';
          
          if (error.message) {
            errorMessage = error.message;
          }
          
          // Handle Zod validation errors specifically
          if (error.issues && Array.isArray(error.issues)) {
            const zodErrors = error.issues.map((issue: any) => {
              const path = issue.path.join('.');
              return `${path}: ${issue.message}`;
            }).join('; ');
            errorMessage = `Validation failed - ${zodErrors}`;
          }
          
          errors.push({ 
            row: i + 1, 
            error: errorMessage,
            data: row // Include the row data for debugging
          });
        }
      }
      
      const result = {
        success: true,
        imported: importedOrders.length,
        errors: errors.length,
        errorDetails: errors
      };

      console.log("Import completed:", result);
      console.log("Sending response:", JSON.stringify(result));
      
      res.json(result);
    } catch (error: any) {
      console.error("Error importing orders:", error);
      res.status(500).json({ 
        message: "Failed to import orders",
        success: false,
        imported: 0,
        errors: 1,
        errorDetails: [{ row: 0, error: error.message || "Internal server error" }]
      });
    }
  });

  // Activity Log routes
  app.get("/api/activity-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId, activityType, limit } = req.query;
      
      const filters: any = {};
      if (orderId) filters.orderId = orderId;
      if (activityType) filters.activityType = activityType;
      if (limit) filters.limit = parseInt(limit as string, 10);
      
      const logs = await storage.getAllActivityLogs(userId, filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get("/api/orders/:id/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const logs = await storage.getOrderActivityLogs(id, userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching order activity logs:", error);
      res.status(500).json({ message: "Failed to fetch order activity logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
