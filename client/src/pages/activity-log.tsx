import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityLogWithOrder, OrderWithRelations } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { 
  Activity, 
  Filter, 
  ChevronRight,
  Clock,
  PackageCheck,
  Edit,
  Calendar,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const activityTypeColors: Record<string, string> = {
  "Order Created": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Status Changed": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "Order Updated": "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "Dates Modified": "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  "Calendar Event Created": "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  "Calendar Event Updated": "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  "Calendar Event Deleted": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  "Order Created": <PackageCheck className="w-4 h-4" />,
  "Status Changed": <Activity className="w-4 h-4" />,
  "Order Updated": <Edit className="w-4 h-4" />,
  "Dates Modified": <Clock className="w-4 h-4" />,
  "Calendar Event Created": <Calendar className="w-4 h-4" />,
  "Calendar Event Updated": <Calendar className="w-4 h-4" />,
  "Calendar Event Deleted": <Calendar className="w-4 h-4" />,
};

export default function ActivityLog() {
  const { isAuthenticated } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);

  const { data: orders = [] } = useQuery<OrderWithRelations[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  // Build query params
  const params = new URLSearchParams();
  if (selectedOrderId) params.append('orderId', selectedOrderId);
  if (selectedActivityType) params.append('activityType', selectedActivityType);
  params.append('limit', '50');
  
  const queryString = params.toString();
  const queryUrl = queryString ? `/api/activity-logs?${queryString}` : '/api/activity-logs';

  const { data: activityLogs = [], isLoading } = useQuery<ActivityLogWithOrder[]>({
    queryKey: [queryUrl],
    enabled: isAuthenticated,
  });

  const clearFilters = () => {
    setSelectedOrderId(null);
    setSelectedActivityType(null);
  };

  const hasActiveFilters = selectedOrderId || selectedActivityType;

  return (
    <MainLayout>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold flex items-center gap-2" data-testid="page-title">
              <Activity className="w-6 h-6" />
              Activity Log
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Track all changes to your orders</p>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        {/* Filters */}
        <Card className="mb-6 card-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                <Filter className="w-4 h-4" />
                Filters:
              </div>
              
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                {/* Order Filter */}
                <Select
                  value={selectedOrderId || "all"}
                  onValueChange={(value) => setSelectedOrderId(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full sm:w-[250px]" data-testid="filter-order">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.productName} ({order.platform})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Activity Type Filter */}
                <Select
                  value={selectedActivityType || "all"}
                  onValueChange={(value) => setSelectedActivityType(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-activity-type">
                    <SelectValue placeholder="All Activity Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity Types</SelectItem>
                    <SelectItem value="Order Created">Order Created</SelectItem>
                    <SelectItem value="Status Changed">Status Changed</SelectItem>
                    <SelectItem value="Order Updated">Order Updated</SelectItem>
                    <SelectItem value="Dates Modified">Dates Modified</SelectItem>
                    <SelectItem value="Calendar Event Created">Calendar Event Created</SelectItem>
                    <SelectItem value="Calendar Event Updated">Calendar Event Updated</SelectItem>
                    <SelectItem value="Calendar Event Deleted">Calendar Event Deleted</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="sm:ml-auto"
                    data-testid="clear-filters"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="card-shadow">
          <CardContent className="p-4 lg:p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No activity logs found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters ? "Try adjusting your filters" : "Activity will appear here when you create or update orders"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className="flex gap-4 group hover:bg-muted/30 -mx-2 p-2 rounded-lg transition-colors"
                    data-testid={`activity-log-${index}`}
                  >
                    {/* Timeline dot */}
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activityTypeColors[log.activityType] || "bg-gray-100 text-gray-800"}`}>
                        {activityTypeIcons[log.activityType] || <Activity className="w-4 h-4" />}
                      </div>
                      {index !== activityLogs.length - 1 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {log.activityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.createdAt && formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{log.description}</p>
                          
                          {log.order && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span className="truncate font-medium">{log.order.productName}</span>
                              <ChevronRight className="w-3 h-3 shrink-0" />
                              <Badge variant="secondary" className="text-xs">
                                {log.order.platform}
                              </Badge>
                              <span className="shrink-0">{formatCurrency(log.order.orderAmount)}</span>
                            </div>
                          )}

                          {(log.oldValue || log.newValue) && (
                            <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                              {log.oldValue && (
                                <div className="mb-1">
                                  <span className="font-medium">From: </span>
                                  <span className="text-muted-foreground">{log.oldValue}</span>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <span className="font-medium">To: </span>
                                  <span className="text-muted-foreground">{log.newValue}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="text-xs shrink-0">
                          {log.triggeredBy}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
