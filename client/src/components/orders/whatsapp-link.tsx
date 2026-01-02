import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { OrderWithRelations } from "@shared/schema";
import { formatCurrency } from "@/lib/currency";

interface WhatsappLinkProps {
  order: OrderWithRelations;
}

// Message templates based on order status
const messageTemplates = {
  orderConfirmation: (order: OrderWithRelations) =>
    `Hi ${order.mediator.name}, Order #${order.orderId} has been placed for ${order.productName} on ${order.platform}. Amount: ${formatCurrency(order.orderAmount)}`,

  deliveryReminder: (order: OrderWithRelations) =>
    `Hi ${order.mediator.name}, Please check delivery status for Order #${order.orderId}. Expected delivery: ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}`,

  refundFormReminder: (order: OrderWithRelations) =>
    `Hi ${order.mediator.name}, Refund form needs to be submitted for Order #${order.orderId} by ${order.refundFormDate ? new Date(order.refundFormDate).toLocaleDateString() : 'N/A'}`,

  paymentRequest: (order: OrderWithRelations) =>
    `Hi ${order.mediator.name}, Please process payment for Order #${order.orderId}. Refund amount: ${formatCurrency(order.refundAmount)}`,

  friendly: (order: OrderWithRelations) =>
    `Hello ${order.mediator.name}! 😊 Quick check on Order #${order.orderId} - ${order.productName}. Current status: ${order.currentStatus}`,

  professional: (order: OrderWithRelations) =>
    `Dear ${order.mediator.name}, Regarding Order #${order.orderId} (${order.productName}). Current status: ${order.currentStatus}. Please update if needed.`,

  custom: (order: OrderWithRelations) =>
    `Hi ${order.mediator.name}, regarding Order #${order.orderId} - ${order.productName}`,
};

export function WhatsappLink({ order }: WhatsappLinkProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("friendly");

  // Generate WhatsApp link based on selected template
  const generateWhatsAppLink = () => {
    const message = messageTemplates[selectedTemplate as keyof typeof messageTemplates]?.(order) || messageTemplates.friendly(order);
    const phoneNumber = order.mediator.whatsappNumber.replace(/\D/g, ''); // Remove non-digits
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  };

  const handleWhatsAppClick = () => {
    const link = generateWhatsAppLink();
    window.open(link, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
        <SelectTrigger className="w-auto h-8 text-xs">
          <SelectValue placeholder="Message type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="friendly">Friendly 😊</SelectItem>
          <SelectItem value="orderConfirmation">Order Confirm</SelectItem>
          <SelectItem value="deliveryReminder">Delivery 🔔</SelectItem>
          <SelectItem value="refundFormReminder">Refund Form 📝</SelectItem>
          <SelectItem value="paymentRequest">Payment 💰</SelectItem>
          <SelectItem value="professional">Professional</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleWhatsAppClick}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        title={`Message ${order.mediator.name} on WhatsApp`}
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
    </div>
  );
}
