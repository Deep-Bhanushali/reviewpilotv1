import { format } from 'date-fns';
import type { OrderWithRelations } from '@shared/schema';

interface CalendarEvent {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
}

// Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ)
function formatGoogleCalendarDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

// Generate Google Calendar URL
export function createGoogleCalendarUrl(event: CalendarEvent): string {
  const startDate = formatGoogleCalendarDate(event.startDateTime);
  const endDate = formatGoogleCalendarDate(event.endDateTime);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description,
    ...(event.location && { location: event.location }),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Create calendar events for an order with all reminder types
export function createOrderCalendarUrls(order: OrderWithRelations): { 
  delivery?: string; 
  reviewRating?: string;
  refundForm?: string;
  mediatorPayment?: string;
} {
  const urls: { 
    delivery?: string; 
    reviewRating?: string;
    refundForm?: string;
    mediatorPayment?: string;
  } = {};

  const toDate = (dateInput: string | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  };

  const deliveryDate = toDate(order.deliveryDate);

  // 1. Delivery reminder event (on delivery date)
  if (deliveryDate) {
    const deliveryStart = new Date(deliveryDate);
    deliveryStart.setHours(10, 0, 0, 0); // 10 AM
    const deliveryEnd = new Date(deliveryStart);
    deliveryEnd.setHours(11, 0, 0, 0); // 11 AM

    urls.delivery = createGoogleCalendarUrl({
      title: `📦 Product Delivery: ${order.productName}`,
      description: `Product: ${order.productName}\nAccount: ${order.account.name}\nPlatform: ${order.platform}`,
      startDateTime: deliveryStart,
      endDateTime: deliveryEnd,
    });

    // 2. Review Rating reminder (2 days after delivery)
    const reviewRatingDate = new Date(deliveryDate);
    reviewRatingDate.setDate(reviewRatingDate.getDate() + 2);
    reviewRatingDate.setHours(14, 0, 0, 0); // 2 PM
    const reviewRatingEnd = new Date(reviewRatingDate);
    reviewRatingEnd.setHours(15, 0, 0, 0); // 3 PM

    const reviewDescription = `Product: ${order.productName}\nAccount: ${order.account.name}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}\nMediator: ${order.mediator.name} (${order.mediator.whatsappNumber})${order.comments ? `\n\nComments:\n${order.comments}` : ''}`;

    urls.reviewRating = createGoogleCalendarUrl({
      title: `⭐ Complete Review & Rating: ${order.productName}`,
      description: reviewDescription,
      startDateTime: reviewRatingDate,
      endDateTime: reviewRatingEnd,
    });

    // 3. Refund Form reminder (7 days after delivery)
    const refundFormDate = new Date(deliveryDate);
    refundFormDate.setDate(refundFormDate.getDate() + 7);
    refundFormDate.setHours(15, 0, 0, 0); // 3 PM
    const refundFormEnd = new Date(refundFormDate);
    refundFormEnd.setHours(16, 0, 0, 0); // 4 PM

    const refundDescription = `Product: ${order.productName}\nAccount: ${order.account.name}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}\nMediator: ${order.mediator.name}${order.refundFormLink ? `\n\nRefund Form Link:\n${order.refundFormLink}` : ''}`;

    urls.refundForm = createGoogleCalendarUrl({
      title: `💰 Submit Refund Form: ${order.productName}`,
      description: refundDescription,
      startDateTime: refundFormDate,
      endDateTime: refundFormEnd,
    });

    // 4. Mediator Payment reminder (20 days after delivery)
    const mediatorPaymentDate = new Date(deliveryDate);
    mediatorPaymentDate.setDate(mediatorPaymentDate.getDate() + 20);
    mediatorPaymentDate.setHours(10, 0, 0, 0); // 10 AM
    const mediatorPaymentEnd = new Date(mediatorPaymentDate);
    mediatorPaymentEnd.setHours(11, 0, 0, 0); // 11 AM

    // Create WhatsApp message for mediator contact
    const phoneNumber = order.mediator.whatsappNumber.replace(/\D/g, '');
    const whatsappMessage = `Hi ${order.mediator.name}! Following up on payment for Order ID: ${order.orderId} - ${order.productName}`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    const paymentDescription = `Product: ${order.productName}\nAccount: ${order.account.name}\nPlatform: ${order.platform}\nOrder ID: ${order.orderId}\nMediator: ${order.mediator.name} (${order.mediator.whatsappNumber})\n\nDirect WhatsApp Link:\n${whatsappLink}`;

    urls.mediatorPayment = createGoogleCalendarUrl({
      title: `💸 Follow Up: Payment Status - ${order.productName}`,
      description: paymentDescription,
      startDateTime: mediatorPaymentDate,
      endDateTime: mediatorPaymentEnd,
    });
  }

  return urls;
}