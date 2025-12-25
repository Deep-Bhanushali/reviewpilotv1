import { useMemo } from "react";
import { OrderWithRelations } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Clock, 
  Calendar,
  ArrowRight,
  Bell,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/currency";

interface SmartNotificationsProps {
  orders: OrderWithRelations[];
  isLoading?: boolean;
}

interface Notification {
  id: string;
  orderId: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  actionLabel: string;
  orderDetails: {
    productName: string;
    platform: string;
    amount: number;
  };
  daysOverdue?: number;
  deadline?: Date;
}

export function SmartNotifications({ orders, isLoading }: SmartNotificationsProps) {
  const notifications = useMemo(() => {
    const now = new Date();
    const notifications: Notification[] = [];

    orders.forEach(order => {
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Critical: Overdue refund form
      if (order.currentStatus === "Overdue Passed for Refund Form") {
        notifications.push({
          id: `${order.id}-overdue-refund`,
          orderId: order.id,
          type: "critical",
          title: "Overdue Refund Form",
          message: "Refund form deadline has passed",
          actionLabel: "Submit Now",
          orderDetails: {
            productName: order.productName,
            platform: order.platform,
            amount: order.refundAmount,
          },
        });
      }

      // Critical: Delivered but no action taken
      if (order.currentStatus === "Delivered" && order.deliveryDate) {
        const daysSinceDelivery = Math.floor((now.getTime() - new Date(order.deliveryDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceDelivery >= 3) {
          notifications.push({
            id: `${order.id}-delivered-action`,
            orderId: order.id,
            type: "critical",
            title: "Action Required",
            message: `Delivered ${daysSinceDelivery} days ago - Submit review now`,
            actionLabel: "Complete Review",
            orderDetails: {
              productName: order.productName,
              platform: order.platform,
              amount: order.refundAmount,
            },
            daysOverdue: daysSinceDelivery - 3,
          });
        }
      }

      // Warning: Upcoming delivery deadline
      if (order.deliveryDate && order.currentStatus === "Ordered") {
        const deliveryDate = new Date(order.deliveryDate);
        if (deliveryDate <= threeDaysFromNow && deliveryDate > now) {
          notifications.push({
            id: `${order.id}-delivery-soon`,
            orderId: order.id,
            type: "warning",
            title: "Delivery Expected Soon",
            message: `Expected ${formatDistanceToNow(deliveryDate, { addSuffix: true })}`,
            actionLabel: "View Order",
            orderDetails: {
              productName: order.productName,
              platform: order.platform,
              amount: order.orderAmount,
            },
            deadline: deliveryDate,
          });
        }
      }

      // Warning: Upcoming refund form deadline
      if (order.refundFormDate && order.currentStatus === "Deliverables Done") {
        const refundFormDate = new Date(order.refundFormDate);
        if (refundFormDate <= threeDaysFromNow && refundFormDate > now) {
          notifications.push({
            id: `${order.id}-refund-soon`,
            orderId: order.id,
            type: "warning",
            title: "Refund Form Due Soon",
            message: `Due ${formatDistanceToNow(refundFormDate, { addSuffix: true })}`,
            actionLabel: "Submit Form",
            orderDetails: {
              productName: order.productName,
              platform: order.platform,
              amount: order.refundAmount,
            },
            deadline: refundFormDate,
          });
        }
      }

      // Info: Remind mediator for payment
      if (order.currentStatus === "Remind Mediator for Payment") {
        notifications.push({
          id: `${order.id}-remind-mediator`,
          orderId: order.id,
          type: "info",
          title: "Follow Up with Mediator",
          message: "Payment reminder needed",
          actionLabel: "Contact Mediator",
          orderDetails: {
            productName: order.productName,
            platform: order.platform,
            amount: order.refundAmount,
          },
        });
      }
    });

    // Sort by priority: critical first, then warning, then info
    return notifications.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    }).slice(0, 5); // Show max 5 notifications
  }, [orders]);

  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Smart Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/20 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Smart Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-3" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No orders need immediate attention</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-4 h-4" />;
      case "warning":
        return <Clock className="w-4 h-4" />;
      case "info":
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900";
      case "warning":
        return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-900";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900";
    }
  };

  const getBadgeVariant = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return "destructive";
      case "warning":
        return "outline";
      case "info":
        return "secondary";
    }
  };

  return (
    <Card className="card-shadow" data-testid="smart-notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Smart Notifications
          {notifications.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {notifications.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Link key={notification.id} href={`/orders?highlight=${notification.orderId}`}>
              <div
                className={`p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer ${getNotificationColor(notification.type)}`}
                data-testid={`notification-${notification.type}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">
                        {notification.title}
                      </p>
                      <Badge variant={getBadgeVariant(notification.type)} className="text-xs shrink-0">
                        {notification.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs truncate">
                        <span className="font-medium">{notification.orderDetails.productName}</span>
                        {" • "}
                        <span>{notification.orderDetails.platform}</span>
                        {" • "}
                        <span className="font-semibold">{formatCurrency(notification.orderDetails.amount)}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {notifications.length >= 5 && (
          <Link href="/orders">
            <Button variant="outline" className="w-full mt-3" size="sm" data-testid="view-all-orders">
              View All Orders
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
