import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createOrderCalendarUrls } from "@/lib/google-calendar-url";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderWithRelations } from "@shared/schema";

interface CreateEventButtonProps {
  order: OrderWithRelations;
  disabled?: boolean;
}

export function CreateEventButton({ 
  order,
  disabled = false 
}: CreateEventButtonProps) {
  const { toast } = useToast();

  // Safety check for order
  if (!order) {
    return null;
  }

  const toDate = (dateInput: string | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  };

  const hasDeliveryDate = !!toDate(order.deliveryDate);

  // Don't show button if no delivery date (all reminders are based on delivery date)
  if (!hasDeliveryDate) {
    return null;
  }

  const calendarUrls = createOrderCalendarUrls(order);

  const handleAddToCalendar = (url: string, eventType: string) => {
    window.open(url, '_blank');
    toast({
      title: "Opening Google Calendar",
      description: `Click 'Save' in Google Calendar to add your ${eventType} reminder!`,
    });
  };

  const handleAddAllEvents = () => {
    const events = [
      { url: calendarUrls.delivery, name: 'delivery' },
      { url: calendarUrls.reviewRating, name: 'review rating' },
      { url: calendarUrls.refundForm, name: 'refund form' },
      { url: calendarUrls.mediatorPayment, name: 'mediator follow-up' },
    ].filter(e => e.url);

    events.forEach((event, index) => {
      setTimeout(() => {
        if (event.url) {
          handleAddToCalendar(event.url, event.name);
        }
      }, index * 500);
    });

    toast({
      title: "Adding All Events",
      description: `Adding ${events.length} reminders to your calendar!`,
    });
  };

  // Always show dropdown menu with all reminder options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={disabled}
          variant="outline"
          size="sm"
          data-testid={`button-add-calendar-${order.id}`}
        >
          <Calendar className="w-4 h-4" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {calendarUrls.delivery && (
          <DropdownMenuItem
            onClick={() => handleAddToCalendar(calendarUrls.delivery!, 'delivery')}
            data-testid={`menu-delivery-${order.id}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">📦 Delivery Day</span>
              <span className="text-xs text-muted-foreground">Product arrival notification</span>
            </div>
          </DropdownMenuItem>
        )}
        {calendarUrls.reviewRating && (
          <DropdownMenuItem
            onClick={() => handleAddToCalendar(calendarUrls.reviewRating!, 'review rating')}
            data-testid={`menu-review-${order.id}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">⭐ Complete Review (Day +2)</span>
              <span className="text-xs text-muted-foreground">Submit rating & review</span>
            </div>
          </DropdownMenuItem>
        )}
        {calendarUrls.refundForm && (
          <DropdownMenuItem
            onClick={() => handleAddToCalendar(calendarUrls.refundForm!, 'refund form')}
            data-testid={`menu-refund-${order.id}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">💰 Refund Form (Day +7)</span>
              <span className="text-xs text-muted-foreground">Fill & submit refund form</span>
            </div>
          </DropdownMenuItem>
        )}
        {calendarUrls.mediatorPayment && (
          <DropdownMenuItem
            onClick={() => handleAddToCalendar(calendarUrls.mediatorPayment!, 'mediator follow-up')}
            data-testid={`menu-mediator-${order.id}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">💸 Payment Check (Day +20)</span>
              <span className="text-xs text-muted-foreground">Contact mediator for payment</span>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleAddAllEvents}
          data-testid={`menu-all-${order.id}`}
          className="border-t mt-1 pt-2"
        >
          <div className="flex flex-col items-start">
            <span className="font-medium">✨ Add All Reminders</span>
            <span className="text-xs text-muted-foreground">Complete timeline for this order</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}