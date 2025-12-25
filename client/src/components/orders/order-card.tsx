import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { OrderWithRelations } from "@shared/schema";
import { 
  Calendar, 
  User, 
  CreditCard, 
  ArrowRight, 
  ExternalLink,
  MessageCircle 
} from "lucide-react";
import { format } from "date-fns";

interface OrderCardProps {
  order: OrderWithRelations;
  onView?: (order: OrderWithRelations) => void;
  onEdit?: (order: OrderWithRelations) => void;
  onUpdateStatus?: (order: OrderWithRelations) => void;
  onMessageMediator?: (order: OrderWithRelations) => void;
}

const statusColors = {
  "Ordered": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "Delivered": "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300", 
  "Deliverables Done": "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "Refund Form Done": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "Overdue Passed for Refund Form": "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Remind Mediator for Payment": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Refunded": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Cancelled": "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
};

const platformIcons: Record<string, string> = {
  Amazon: "🛒",
  Flipkart: "🛍️", 
  Myntra: "👗",
  Meesho: "🏪",
  Ajio: "👕",
  Nykaa: "💄",
  "Paytm Mall": "💳",
  Snapdeal: "🛒",
};

export function OrderCard({ 
  order, 
  onView, 
  onEdit, 
  onUpdateStatus, 
  onMessageMediator 
}: OrderCardProps) {
  const profit = order.refundAmount - order.orderAmount;
  const isProfit = profit >= 0;

  const handleProductLink = () => {
    if (order.productLink) {
      window.open(order.productLink, '_blank');
    }
  };

  const handleWhatsAppMediator = () => {
    const phoneNumber = order.mediator.whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hi! Regarding order: ${order.productName}\nOrder ID: ${order.orderId}\nPlatform: ${order.platform}\nCurrent Status: ${order.currentStatus}`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <Card className="card-shadow hover:shadow-md transition-shadow" data-testid={`order-card-${order.id}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {platformIcons[order.platform] || "🏪"}
            </div>
            <div>
              <h3 className="font-semibold truncate" data-testid={`order-product-name-${order.id}`}>
                {order.productName}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span data-testid={`order-platform-${order.id}`}>{order.platform}</span>
                <span>•</span>
                <span data-testid={`order-id-${order.id}`}>{order.orderId}</span>
              </div>
            </div>
          </div>
          <Badge 
            className={statusColors[order.currentStatus as keyof typeof statusColors]}
            data-testid={`order-status-${order.id}`}
          >
            {order.currentStatus}
          </Badge>
        </div>

        {/* Financial Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Order Amount</p>
            <p className="font-semibold" data-testid={`order-amount-${order.id}`}>
              {formatCurrency(order.orderAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Refund Amount</p>
            <p className="font-semibold" data-testid={`order-refund-${order.id}`}>
              {formatCurrency(order.refundAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit/Loss</p>
            <p className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`} data-testid={`order-profit-${order.id}`}>
              {isProfit ? '+' : ''}{formatCurrency(Math.abs(profit))}
            </p>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Mediator:</span>
            <span data-testid={`order-mediator-${order.id}`}>{order.mediator.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Account:</span>
            <span data-testid={`order-account-${order.id}`}>{order.account.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Order Date:</span>
            <span data-testid={`order-date-${order.id}`}>
              {format(new Date(order.orderDate), 'MMM dd, yyyy')}
            </span>
          </div>
          {order.deliveryDate && (
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Delivery Date:</span>
              <span data-testid={`order-delivery-date-${order.id}`}>
                {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView?.(order)}
            data-testid={`button-view-order-${order.id}`}
          >
            View Details
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit?.(order)}
            data-testid={`button-edit-order-${order.id}`}
          >
            Edit
          </Button>
          
          {order.currentStatus !== "Refunded" && order.currentStatus !== "Cancelled" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onUpdateStatus?.(order)}
              data-testid={`button-update-status-${order.id}`}
            >
              Update Status
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleWhatsAppMediator}
            className="text-green-600 hover:text-green-700"
            data-testid={`button-whatsapp-${order.id}`}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          {order.productLink && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleProductLink}
              data-testid={`button-product-link-${order.id}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
