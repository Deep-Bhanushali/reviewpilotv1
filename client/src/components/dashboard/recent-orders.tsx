import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/currency";
import { OrderWithRelations } from "@shared/schema";

interface RecentOrdersProps {
  orders: OrderWithRelations[];
  isLoading?: boolean;
}

const statusColors = {
  "Ordered": "bg-blue-50 text-blue-700",
  "Delivered": "bg-green-50 text-green-700", 
  "Deliverables Done": "bg-purple-50 text-purple-700",
  "Refund Form Done": "bg-indigo-50 text-indigo-700",
  "Overdue Passed for Refund Form": "bg-red-50 text-red-700",
  "Remind Mediator for Payment": "bg-orange-50 text-orange-700",
  "Refunded": "bg-emerald-50 text-emerald-700",
  "Cancelled": "bg-gray-50 text-gray-700",
};

export function RecentOrders({ orders, isLoading }: RecentOrdersProps) {
  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base lg:text-lg">Recent Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="space-y-3 lg:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 lg:space-x-4 p-3 lg:p-4 border border-border rounded-lg animate-pulse">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-muted rounded-lg shrink-0"></div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 lg:h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-2 lg:h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="space-y-2 shrink-0">
                  <div className="h-3 lg:h-4 bg-muted rounded w-16 lg:w-20"></div>
                  <div className="h-5 lg:h-6 bg-muted rounded w-20 lg:w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base lg:text-lg">Recent Orders</CardTitle>
          <Link href="/orders">
            <Button variant="ghost" size="sm" data-testid="link-view-all-orders" className="text-xs lg:text-sm">
              View all
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6">
        {orders.length === 0 ? (
          <div className="text-center py-6 lg:py-8 text-muted-foreground">
            <p className="text-sm lg:text-base">No orders yet</p>
            <p className="text-xs lg:text-sm mt-1">Create your first order to get started</p>
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            {orders.slice(0, 3).map((order) => (
              <div 
                key={order.id} 
                className="flex items-center space-x-3 lg:space-x-4 p-3 lg:p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                data-testid={`recent-order-${order.id}`}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[10px] lg:text-xs font-medium">
                    {order.platform.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm lg:text-base" data-testid={`order-product-name-${order.id}`}>
                    {order.productName}
                  </p>
                  <p className="text-xs lg:text-sm text-muted-foreground" data-testid={`order-platform-${order.id}`}>
                    {order.platform}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-sm lg:text-base" data-testid={`order-amount-${order.id}`}>
                    {formatCurrency(order.orderAmount)}
                  </p>
                  <Badge 
                    className={`${statusColors[order.currentStatus as keyof typeof statusColors]} text-[10px] lg:text-xs`}
                    data-testid={`order-status-${order.id}`}
                  >
                    {order.currentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
