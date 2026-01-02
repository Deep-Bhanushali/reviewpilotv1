import cron from 'node-cron';
import { db } from './db.js';
import { orders, notifications, activityLogs } from './shared/schema.js';
import { eq, and, lt, lte, or, isNull, gte } from 'drizzle-orm';
import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Cron Job Service for ReviewPilot
 * Runs scheduled tasks to check and update orders based on dates
 */
class CronJobService {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Check for orders that should be marked as delivered today
   * Updates orders whose delivery date matches today's date
   */
  private async checkAndUpdateDeliveredOrders(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Starting delivery status check...`);

      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      // Find all orders that:
      // 1. Have a delivery date
      // 2. Current status is "Ordered"
      const ordersToUpdate = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.currentStatus, "Ordered")
          )
        );

      console.log(`[${new Date().toISOString()}] Found ${ordersToUpdate.length} orders to check for delivery update`);

      let updatedCount = 0;

      for (const order of ordersToUpdate) {
        // Check if the delivery date is today
        if (order.deliveryDate) {
          const deliveryDate = new Date(order.deliveryDate);
          const isToday = deliveryDate >= startOfToday && deliveryDate <= endOfToday;

          // Only update if status is still "Ordered" and delivery date is today
          if (isToday && order.currentStatus === "Ordered") {
            // Update order status to "Delivered"
            await db
              .update(orders)
              .set({
                currentStatus: "Delivered",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            // Create activity log
            await db.insert(activityLogs).values({
              userId: order.userId,
              orderId: order.id,
              activityType: "Status Changed",
              description: `Order status automatically updated from "Ordered" to "Delivered" by cron job`,
              oldValue: "Ordered",
              newValue: "Delivered",
              triggeredBy: "System",
            });

            // Create notification for the user
            await db.insert(notifications).values({
              userId: order.userId,
              orderId: order.id,
              type: "Success",
              reminderCategory: "Delivery",
              title: "Order Delivered",
              message: `Your order "${order.productName}" from ${order.platform} has been delivered. Order ID: ${order.orderId}`,
              isRead: 0,
            });

            updatedCount++;
            console.log(`[${new Date().toISOString()}] Updated order ${order.orderId} (${order.productName}) to Delivered`);
          }
        }
      }

      console.log(`[${new Date().toISOString()}] Delivery status check completed. Updated ${updatedCount} order(s).`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking delivered orders:`, error);
    }
  }

  /**
   * Check for orders with overdue refund form dates
   * Creates notifications for orders that have passed the refund form deadline
   */
  private async checkOverdueRefundForms(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Starting overdue refund form check...`);

      const today = new Date();
      const startOfToday = startOfDay(today);

      // Find orders where:
      // 1. Status is "Delivered" or "Deliverables Done"
      // 2. Refund form date has passed
      const overdueOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            lt(orders.refundFormDate, startOfToday)
          )
        );

      console.log(`[${new Date().toISOString()}] Found ${overdueOrders.length} orders with overdue refund forms`);

      let updatedCount = 0;

      for (const order of overdueOrders) {
        // Check if refund form date is in the past
        if (order.refundFormDate) {
          const refundDate = new Date(order.refundFormDate);
          const isPast = refundDate < startOfToday;

          if (isPast && !order.currentStatus.includes("Overdue")) {
            // Update status to overdue
            await db
              .update(orders)
              .set({
                currentStatus: "Overdue Passed for Refund Form",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            // Create activity log
            await db.insert(activityLogs).values({
              userId: order.userId,
              orderId: order.id,
              activityType: "Status Changed",
              description: `Order marked as "Overdue Passed for Refund Form" by cron job - refund form date was ${format(refundDate, 'yyyy-MM-dd')}`,
              oldValue: order.currentStatus,
              newValue: "Overdue Passed for Refund Form",
              triggeredBy: "System",
            });

            // Create critical notification
            await db.insert(notifications).values({
              userId: order.userId,
              orderId: order.id,
              type: "Critical",
              reminderCategory: "Refund_Form",
              title: "Refund Form Deadline Passed",
              message: `The refund form deadline for "${order.productName}" has passed. Deadline was ${format(refundDate, 'MMMM d, yyyy')}. Please contact the mediator.`,
              isRead: 0,
            });

            updatedCount++;
            console.log(`[${new Date().toISOString()}] Marked order ${order.orderId} as overdue`);
          }
        }
      }

      console.log(`[${new Date().toISOString()}] Overdue refund form check completed. Updated ${updatedCount} order(s).`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking overdue refund forms:`, error);
    }
  }

  /**
   * Start all cron jobs
   */
  public start(): void {
    console.log('Starting ReviewPilot Cron Job Service...');

    // Schedule delivery status check - runs every day at 9:00 AM
    const deliveryTask = cron.schedule('0 9 * * *', async () => {
      await this.checkAndUpdateDeliveredOrders();
    }, {
      timezone: process.env.TZ || 'Asia/Kolkata'
    });

    this.tasks.push(deliveryTask);
    console.log('✓ Scheduled delivery status check: Daily at 9:00 AM');

    // Schedule overdue refund form check - runs every day at 9:00 AM (after delivery check)
    const overdueTask = cron.schedule('30 9 * * *', async () => {
      await this.checkOverdueRefundForms();
    }, {
      timezone: process.env.TZ || 'Asia/Kolkata'
    });

    this.tasks.push(overdueTask);
    console.log('✓ Scheduled overdue refund form check: Daily at 9:30 AM');

    console.log(`\nCron Job Service started successfully. Timezone: ${process.env.TZ || 'Asia/Kolkata'}`);
    console.log('Press Ctrl+C to stop the service.\n');
  }

  /**
   * Stop all cron jobs
   */
  public stop(): void {
    console.log('\nStopping ReviewPilot Cron Job Service...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('All cron jobs stopped.');
  }

  /**
   * Run tasks manually (for testing)
   */
  public async runManually(): Promise<void> {
    console.log('Running cron jobs manually...\n');
    await this.checkAndUpdateDeliveredOrders();
    console.log('\n');
    await this.checkOverdueRefundForms();
    console.log('\nManual run completed.');
  }
}

// Export singleton instance
export const cronJobService = new CronJobService();
