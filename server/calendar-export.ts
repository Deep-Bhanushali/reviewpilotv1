import { format } from 'date-fns';

interface CalendarEvent {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
}

export function generateICSFile(events: CalendarEvent[]): string {
  const formatDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const generateUID = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@reviewer-system.com`;
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Online Reviewer System//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  for (const event of events) {
    const startDate = formatDate(event.startDateTime);
    const endDate = formatDate(event.endDateTime);
    const uid = generateUID();
    
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      `DTSTAMP:${formatDate(new Date())}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

export function createOrderCalendarEvents(order: {
  id: string;
  productName: string;
  orderId: string;
  platform: string;
  deliveryDate?: Date | string | null;
  refundFormDate?: Date | string | null;
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Helper function to convert string dates to Date objects
  const toDate = (dateInput: string | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  };

  const deliveryDate = toDate(order.deliveryDate);
  const refundDate = toDate(order.refundFormDate);

  // Delivery reminder event
  if (deliveryDate) {
    const deliveryStart = new Date(deliveryDate);
    deliveryStart.setHours(10, 0, 0, 0); // 10 AM
    const deliveryEnd = new Date(deliveryStart);
    deliveryEnd.setHours(11, 0, 0, 0); // 11 AM

    events.push({
      title: `📦 Product Delivery: ${order.productName}`,
      description: `Order ID: ${order.orderId}\\nPlatform: ${order.platform}\\nExpected delivery for: ${order.productName}\\n\\nNext Steps:\\n- Check for delivery confirmation\\n- Unbox and test the product\\n- Prepare for review submission`,
      startDateTime: deliveryStart,
      endDateTime: deliveryEnd,
    });
  }

  // Refund form reminder event
  if (refundDate) {
    const refundStart = new Date(refundDate);
    refundStart.setHours(14, 0, 0, 0); // 2 PM
    const refundEnd = new Date(refundStart);
    refundEnd.setHours(15, 0, 0, 0); // 3 PM

    events.push({
      title: `💰 Submit Refund Form: ${order.productName}`,
      description: `Order ID: ${order.orderId}\\nPlatform: ${order.platform}\\nRefund form deadline for: ${order.productName}\\n\\nAction Required:\\n- Submit product review on platform\\n- Fill and submit refund form\\n- Upload required screenshots`,
      startDateTime: refundStart,
      endDateTime: refundEnd,
    });
  }

  return events;
}