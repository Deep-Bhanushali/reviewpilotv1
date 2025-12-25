import { googleCalendarService } from "./google-calendar";
import { storage } from "./storage";
import { Order } from "@shared/schema";

interface CalendarEventIds {
  delivery?: string;
  review?: string;
  refundForm?: string;
}

export async function syncOrderToCalendar(
  userId: string,
  order: Order,
  action: "create" | "update" | "delete"
): Promise<void> {
  try {
    // Get user settings to check if calendar is enabled
    const settings = await storage.getUserSettings(userId);
    
    if (!settings?.calendarEnabled || !settings.googleAccessToken) {
      return; // Calendar not enabled or not connected
    }

    // Parse existing event IDs
    const existingEventIds: CalendarEventIds = order.calendarEventIds 
      ? JSON.parse(order.calendarEventIds) 
      : {};

    // Handle delete action
    if (action === "delete") {
      // Delete all calendar events for this order
      if (existingEventIds.delivery) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.delivery,
          settings.calendarId || 'primary'
        );
      }
      if (existingEventIds.review) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.review,
          settings.calendarId || 'primary'
        );
      }
      if (existingEventIds.refundForm) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.refundForm,
          settings.calendarId || 'primary'
        );
      }

      // Log calendar event deletion
      await storage.createActivityLog(userId, {
        orderId: order.id,
        activityType: "Calendar Event Deleted",
        description: `Calendar events removed for ${order.productName}`,
        triggeredBy: "System"
      });
      return;
    }

    const newEventIds: CalendarEventIds = {};

    // If delivery date is cleared, delete all events and clear IDs
    if (!order.deliveryDate && action === "update") {
      if (existingEventIds.delivery) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.delivery,
          settings.calendarId || 'primary'
        );
      }
      if (existingEventIds.review) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.review,
          settings.calendarId || 'primary'
        );
      }
      if (existingEventIds.refundForm) {
        await googleCalendarService.deleteCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.refundForm,
          settings.calendarId || 'primary'
        );
      }

      // Clear calendar event IDs
      await storage.updateOrder(order.id, userId, {
        calendarEventIds: null
      });

      await storage.createActivityLog(userId, {
        orderId: order.id,
        activityType: "Calendar Event Deleted",
        description: `Calendar events removed (delivery date cleared) for ${order.productName}`,
        triggeredBy: "System"
      });
      return;
    }

    // Only sync if delivery date is set
    if (!order.deliveryDate) {
      return;
    }

    const deliveryDate = new Date(order.deliveryDate);
    
    // 1. Delivery reminder event
    const deliveryStart = new Date(deliveryDate);
    deliveryStart.setHours(10, 0, 0, 0);
    const deliveryEnd = new Date(deliveryStart);
    deliveryEnd.setHours(11, 0, 0, 0);

    const deliveryEventData = {
      title: `📦 Product Delivery: ${order.productName}`,
      description: `Product: ${order.productName}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}`,
      startDateTime: deliveryStart,
      endDateTime: deliveryEnd,
      calendarId: settings.calendarId || 'primary'
    };

    if (existingEventIds.delivery && action === "update") {
      // Update existing event
      await googleCalendarService.updateCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        existingEventIds.delivery,
        deliveryEventData
      );
      newEventIds.delivery = existingEventIds.delivery;
    } else {
      // Create new event
      const event = await googleCalendarService.createCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        deliveryEventData
      );
      newEventIds.delivery = event.id!;
    }

    // 2. Review reminder event (2 days after delivery)
    const reviewDate = new Date(deliveryDate);
    reviewDate.setDate(reviewDate.getDate() + 2);
    reviewDate.setHours(14, 0, 0, 0);
    const reviewEnd = new Date(reviewDate);
    reviewEnd.setHours(15, 0, 0, 0);

    const reviewEventData = {
      title: `⭐ Complete Review & Rating: ${order.productName}`,
      description: `Product: ${order.productName}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}`,
      startDateTime: reviewDate,
      endDateTime: reviewEnd,
      calendarId: settings.calendarId || 'primary'
    };

    if (existingEventIds.review && action === "update") {
      await googleCalendarService.updateCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        existingEventIds.review,
        reviewEventData
      );
      newEventIds.review = existingEventIds.review;
    } else {
      const event = await googleCalendarService.createCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        reviewEventData
      );
      newEventIds.review = event.id!;
    }

    // 3. Refund form reminder if date is set
    if (order.refundFormDate) {
      const refundDate = new Date(order.refundFormDate);
      refundDate.setHours(15, 0, 0, 0);
      const refundEnd = new Date(refundDate);
      refundEnd.setHours(16, 0, 0, 0);

      const refundEventData = {
        title: `💰 Submit Refund Form: ${order.productName}`,
        description: `Product: ${order.productName}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}${order.refundFormLink ? `\nForm Link: ${order.refundFormLink}` : ''}`,
        startDateTime: refundDate,
        endDateTime: refundEnd,
        calendarId: settings.calendarId || 'primary'
      };

      if (existingEventIds.refundForm && action === "update") {
        await googleCalendarService.updateCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          existingEventIds.refundForm,
          refundEventData
        );
        newEventIds.refundForm = existingEventIds.refundForm;
      } else {
        const event = await googleCalendarService.createCalendarEvent(
          settings.googleAccessToken,
          settings.googleRefreshToken!,
          refundEventData
        );
        newEventIds.refundForm = event.id!;
      }
    } else if (existingEventIds.refundForm && action === "update") {
      // Refund form date was cleared - delete the event
      await googleCalendarService.deleteCalendarEvent(
        settings.googleAccessToken,
        settings.googleRefreshToken!,
        existingEventIds.refundForm,
        settings.calendarId || 'primary'
      );
    }

    // Update order with calendar event IDs (or clear if none)
    await storage.updateOrder(order.id, userId, {
      calendarEventIds: Object.keys(newEventIds).length > 0 ? JSON.stringify(newEventIds) : null
    });

    // Log calendar sync
    const activityType = action === "create" ? "Calendar Event Created" : "Calendar Event Updated";
    await storage.createActivityLog(userId, {
      orderId: order.id,
      activityType,
      description: `Calendar events ${action === "create" ? "created" : "updated"} for ${order.productName}`,
      triggeredBy: "System"
    });

  } catch (error) {
    console.error("Error syncing order to calendar:", error);
    // Don't throw - calendar sync should not block order operations
  }
}
