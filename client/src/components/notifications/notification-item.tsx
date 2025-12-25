import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { NotificationWithOrder } from "@shared/schema";
import { AlertTriangle, CheckCircle, Info, Truck } from "lucide-react";

interface NotificationItemProps {
  notification: NotificationWithOrder;
  onMarkRead?: (id: string) => void;
  onViewOrder?: (orderId: string) => void;
  onMessageMediator?: (orderId: string) => void;
}

const typeIcons = {
  Critical: AlertTriangle,
  Warning: AlertTriangle,
  Success: CheckCircle,
  Info: Info,
};

const typeColors = {
  Critical: "bg-red-50 text-red-600",
  Warning: "bg-orange-50 text-orange-600", 
  Success: "bg-green-50 text-green-600",
  Info: "bg-blue-50 text-blue-600",
};

export function NotificationItem({ 
  notification, 
  onMarkRead, 
  onViewOrder,
  onMessageMediator 
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || Info;
  const isUnread = notification.isRead === 0;

  return (
    <div 
      className={`p-6 hover:bg-muted/20 transition-colors ${isUnread ? 'bg-muted/10' : ''}`}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start space-x-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[notification.type]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-sm" data-testid={`notification-title-${notification.id}`}>
                {notification.title}
              </h4>
              {isUnread && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground" data-testid={`notification-time-${notification.id}`}>
              {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Unknown time'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2" data-testid={`notification-message-${notification.id}`}>
            {notification.message}
          </p>
          {notification.order && (
            <p className="text-xs text-muted-foreground mb-2" data-testid={`notification-order-id-${notification.id}`}>
              Order ID: <span className="font-mono font-medium">{notification.order.orderId}</span> • {notification.order.productName}
            </p>
          )}
          <div className="flex items-center space-x-3">
            {notification.order && onViewOrder && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs p-0 h-auto"
                onClick={() => onViewOrder(notification.order!.id)}
                data-testid={`button-view-order-${notification.id}`}
              >
                View Order
              </Button>
            )}
            {notification.order && onMessageMediator && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs p-0 h-auto text-primary"
                onClick={() => onMessageMediator(notification.order!.id)}
                data-testid={`button-message-mediator-${notification.id}`}
              >
                Message Mediator
              </Button>
            )}
            {isUnread && onMarkRead && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs p-0 h-auto"
                onClick={() => onMarkRead(notification.id)}
                data-testid={`button-mark-read-${notification.id}`}
              >
                Mark Read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
