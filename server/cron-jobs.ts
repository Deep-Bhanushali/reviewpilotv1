import cron from 'node-cron';
import { db } from './db';
import { orders, notifications, activityLogs, users } from '@shared/schema';
import { eq, and, lt, lte, or, isNull } from 'drizzle-orm';
import { format, addDays, differenceInDays, startOfDay, endOfDay, subDays } from 'date-fns';

/**
 * Cron Job Service for ReviewPilot
 * Runs scheduled tasks to check and update orders based on dates
 */
class CronJobService {
  private tasks: any[] = [];
  private isRunning = false;

  /**
   * Initialize and start all cron jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ Cron jobs are already running');
      return;
    }

    console.log('🚀 Starting Cron Job Service...');

    // Run every hour (at minute 0)
    const hourlyTask = cron.schedule('0 * * * *', () => {
      this.runHourlyChecks();
    });

    // Run daily at 9:00 AM
    const dailyTask = cron.schedule('0 9 * * *', () => {
      this.runDailyChecks();
    });

    this.tasks.push(hourlyTask, dailyTask);
    this.isRunning = true;

    console.log('✅ Cron Job Service started successfully');
    console.log('📅 Scheduled tasks:');
    console.log('   - Hourly checks: Every hour at minute 0');
    console.log('   - Daily checks: Every day at 9:00 AM');
    console.log(`   - Timezone: ${process.env.TZ || 'Asia/Kolkata'}`);

    // Run initial check on startup
    setTimeout(() => {
      this.runInitialCheck();
    }, 5000); // Wait 5 seconds after server starts
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    console.log('🛑 Stopping Cron Job Service...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    this.isRunning = false;
    console.log('✅ Cron Job Service stopped');
  }

  /**
   * Run checks immediately after server starts
   * Only processes urgent items (notifications, not status updates)
   */
  private async runInitialCheck() {
    console.log('🔍 Running initial checks on startup...');
    try {
      await this.checkAndCreateNotifications();
      console.log('✅ Initial checks completed');
    } catch (error) {
      console.error('❌ Error in initial checks:', error);
    }
  }

  /**
   * Hourly checks - Create notifications for urgent items
   */
  private async runHourlyChecks() {
    console.log('⏰ Running hourly checks...');
    const startTime = Date.now();
    try {
      const notificationCount = await this.checkAndCreateNotifications();
      const elapsed = Date.now() - startTime;
      console.log(`✅ Hourly checks completed (${elapsed}ms) - ${notificationCount} notifications created`);
    } catch (error) {
      console.error('❌ Error in hourly checks:', error);
    }
  }

  /**
   * Daily checks - Update order statuses and check all dates
   */
  private async runDailyChecks() {
    console.log('📅 Running daily checks...');
    const startTime = Date.now();
    try {
      const notificationCount = await this.checkAndCreateNotifications();
      const statusUpdateCount = await this.updateOrderStatuses();
      const elapsed = Date.now() - startTime;
      console.log(`✅ Daily checks completed (${elapsed}ms)`);
      console.log(`   - ${notificationCount} notifications created`);
      console.log(`   - ${statusUpdateCount} order statuses updated`);
    } catch (error) {
      console.error('❌ Error in daily checks:', error);
    }
  }

  /**
   * Check all orders and create notifications for date-based reminders
   */
  private async checkAndCreateNotifications(): Promise<number> {
    const now = new Date();
    const today = startOfDay(now);
    const in3Days = addDays(today, 3);
    const todayEnd = endOfDay(now);
    const yesterday = subDays(today, 1);

    let notificationsCreated = 0;

    try {
      // Get all orders with delivery dates
      const ordersWithDelivery = await db
        .select()
        .from(orders)
        .where(
          and(
            isNull(orders.calendarEventIds), // Only process orders without calendar events
            lt(orders.deliveryDate, in3Days), // Delivery within 3 days
            lte(orders.deliveryDate, todayEnd) // Delivery today or before
          )
        );

      // Get all orders with refund form dates
      const ordersWithRefundDate = await db
        .select()
        .from(orders)
        .where(
          and(
            isNull(orders.calendarEventIds),
            lt(orders.refundFormDate, in3Days), // Refund form due within 3 days
            lte(orders.refundFormDate, todayEnd)
          )
        );

      // Process delivery reminders
      for (const order of ordersWithDelivery) {
        if (order.deliveryDate) {
          const daysUntilDelivery = differenceInDays(new Date(order.deliveryDate), today);

          // Only create notification if it doesn't already exist
          const existingNotification = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.orderId, order.id),
                eq(notifications.type, 'Warning')
              )
            )
            .limit(1);

          if (existingNotification.length === 0) {
            if (daysUntilDelivery <= 1) {
              // Delivery expected within 1 day
              await this.createNotification(order.userId, {
                orderId: order.id,
                type: 'Warning',
                title: 'Delivery Expected Soon',
                message: `Product "${order.productName}" (Order #${order.orderId}) is expected to be delivered within 24 hours.`
              });
              notificationsCreated++;
            } else if (daysUntilDelivery <= 3) {
              // Delivery expected within 3 days
              await this.createNotification(order.userId, {
                orderId: order.id,
                type: 'Warning',
                title: 'Delivery Coming Up',
                message: `Product "${order.productName}" (Order #${order.orderId}) delivery expected in ${daysUntilDelivery} day(s).`
              });
              notificationsCreated++;
            }
          }
        }
      }

      // Process refund form reminders
      for (const order of ordersWithRefundDate) {
        if (order.refundFormDate) {
          const daysUntilRefund = differenceInDays(new Date(order.refundFormDate), today);
          const existingNotification = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.orderId, order.id),
                eq(notifications.type, 'Warning')
              )
            )
            .limit(1);

          if (existingNotification.length === 0) {
            if (daysUntilRefund <= 0) {
              // Refund form due today or overdue
              await this.createNotification(order.userId, {
                orderId: order.id,
                type: 'Critical',
                title: 'Refund Form Deadline Passed',
                message: `Refund form for "${order.productName}" (Order #${order.orderId}) was due on ${format(new Date(order.refundFormDate), 'MMM dd')}. Please submit immediately!`
              });
              notificationsCreated++;
            } else if (daysUntilRefund <= 3) {
              // Refund form due within 3 days
              await this.createNotification(order.userId, {
                orderId: order.id,
                type: 'Warning',
                title: 'Refund Form Due Soon',
                message: `Refund form for "${order.productName}" (Order #${order.orderId}) is due in ${daysUntilRefund} day(s).`
              });
              notificationsCreated++;
            }
          }
        }
      }

      // Check for products delivered but no review after 3 days
      const deliveredOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.currentStatus, 'Delivered'),
            lt(orders.deliveryDate, yesterday)
          )
        );

      for (const order of deliveredOrders) {
        if (order.deliveryDate) {
          const daysSinceDelivery = differenceInDays(today, new Date(order.deliveryDate));

          if (daysSinceDelivery >= 3) {
            const existingNotification = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.orderId, order.id),
                  eq(notifications.type, 'Critical')
                )
              )
              .limit(1);

            if (existingNotification.length === 0) {
              await this.createNotification(order.userId, {
                orderId: order.id,
                type: 'Critical',
                title: 'Review Overdue',
                message: `Product "${order.productName}" was delivered ${daysSinceDelivery} days ago. Complete review & rating now!`
              });
              notificationsCreated++;
            }
          }
        }
      }

      return notificationsCreated;
    } catch (error) {
      console.error('Error checking and creating notifications:', error);
      return 0;
    }
  }

  /**
   * Update order statuses based on dates
   * This runs daily to automatically move orders through the lifecycle
   */
  private async updateOrderStatuses(): Promise<number> {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);

    let statusUpdates = 0;

    try {
      // Check for overdue refund forms
      const overdueRefundForms = await db
        .select()
        .from(orders)
        .where(
          and(
            or(
              eq(orders.currentStatus, 'Delivered'),
              eq(orders.currentStatus, 'Deliverables Done')
            ),
            lt(orders.refundFormDate, today),
            isNull(orders.calendarEventIds)
          )
        );

      for (const order of overdueRefundForms) {
        if (order.refundFormDate) {
          const daysOverdue = differenceInDays(today, new Date(order.refundFormDate));

          if (daysOverdue > 0) {
            // Update status to Overdue
            await db
              .update(orders)
              .set({
                currentStatus: 'Overdue Passed for Refund Form',
                updatedAt: now
              })
              .where(eq(orders.id, order.id));

            // Create activity log
            await this.createActivityLog(order.userId, {
              orderId: order.id,
              activityType: 'Status Changed',
              description: `Order status automatically updated to "Overdue Passed for Refund Form" - Refund form was due on ${format(new Date(order.refundFormDate), 'MMM dd, yyyy')}`,
              oldValue: order.currentStatus,
              newValue: 'Overdue Passed for Refund Form',
              triggeredBy: 'System'
            });

            // Create notification
            await this.createNotification(order.userId, {
              orderId: order.id,
              type: 'Critical',
              title: 'Order Status Updated',
              message: `"${order.productName}" (Order #${order.orderId}) marked as overdue. Refund form was due on ${format(new Date(order.refundFormDate), 'MMM dd')}.`
            });

            statusUpdates++;
          }
        }
      }

      return statusUpdates;
    } catch (error) {
      console.error('Error updating order statuses:', error);
      return 0;
    }
  }

  /**
   * Helper: Create a notification
   */
  private async createNotification(userId: string, notificationData: {
    orderId: string;
    type: 'Critical' | 'Warning' | 'Success' | 'Info';
    title: string;
    message: string;
  }) {
    try {
      await db.insert(notifications).values({
        userId,
        orderId: notificationData.orderId,
        type: notificationData.type,
        reminderCategory: 'General',
        title: notificationData.title,
        message: notificationData.message,
        isRead: 0
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Helper: Create an activity log
   */
  private async createActivityLog(userId: string, logData: {
    orderId: string;
    activityType: string;
    description: string;
    oldValue?: string;
    newValue?: string;
    triggeredBy?: string;
  }) {
    try {
      await db.insert(activityLogs).values({
        userId,
        orderId: logData.orderId,
        activityType: logData.activityType as any,
        description: logData.description,
        oldValue: logData.oldValue || null,
        newValue: logData.newValue || null,
        triggeredBy: logData.triggeredBy || 'System'
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
    }
  }
}

// Export singleton instance
export const cronJobService = new CronJobService();
