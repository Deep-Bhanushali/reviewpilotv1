import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import StatsCard from "@/components/dashboard/stats-card";
import QuickActions from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, calculateProfit } from "@/lib/currency";
import { 
  TrendingUp, 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  ArrowUp,
  ChartLine,
  Plus
} from "lucide-react";
import type { OrderWithRelations } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // State for date range filter - initialize as empty
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", startDate, endDate],
    queryFn: async () => {
      // If dates are selected, include them in query params
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('start', startDate);
        params.append('end', endDate);
      }
      const queryString = params.toString();
      const url = `/api/dashboard/stats${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const recentOrders = (orders as OrderWithRelations[] || []).slice(0, 3);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Ordered': return 'secondary';
      case 'Delivered': return 'default';
      case 'Deliverables Done': return 'default';
      case 'Refund Form Done': return 'default';
      case 'Refunded': return 'default';
      case 'Overdue Passed for Refund Form': return 'destructive';
      case 'Remind Mediator for Payment': return 'destructive';
      case 'Cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <MainLayout>
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, manage your review orders efficiently</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button data-testid="button-new-order">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Quick Actions */}
        <QuickActions
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Monthly Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Monthly Earnings"
            value={statsLoading ? "..." : formatCurrency(stats?.monthlyEarnings || 0)}
            subtitle="+12% from last month"
            icon={TrendingUp}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />

          <StatsCard
            title="Active Orders"
            value={statsLoading ? "..." : (stats?.monthlyOrders || 0).toString()}
            subtitle="Pending completion"
            icon={ShoppingCart}
            iconColor="text-blue-600"
          />

          <StatsCard
            title="Success Rate"
            value={statsLoading ? "..." : `${stats?.completedReviews || 0}`}
            subtitle="Completed reviews"
            icon={CheckCircle}
            iconColor="text-emerald-600"
          />

          <StatsCard
            title="Total Pending"
            value={statsLoading ? "..." : formatCurrency(stats?.totalPendingRefund || 0)}
            subtitle="Across all accounts"
            icon={Clock}
            iconColor="text-orange-600"
            valueColor="text-orange-600"
          />
        </div>

        {/* Pending Amounts by Bank Account */}
        {(stats?.pendingByBankAccount && stats.pendingByBankAccount.length > 0) && (
          <Card className="border-border mb-8">
            <CardHeader>
              <CardTitle>Pending Amounts by Bank Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track which bank accounts have pending refunds
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.pendingByBankAccount.map((bankAccount: any) => (
                  <div
                    key={bankAccount.bankAccountId}
                    className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">
                          {bankAccount.accountName}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          ****{bankAccount.accountNumber.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-orange-600">
                          {formatCurrency(bankAccount.pendingAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bankAccount.orderCount} {bankAccount.orderCount === 1 ? 'order' : 'orders'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Pending
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No pending amounts message */}
        {(!statsLoading && (!stats?.pendingByBankAccount || stats.pendingByBankAccount.length === 0)) && (
          <Card className="border-border mb-8">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No pending refunds across your bank accounts
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="link" size="sm" data-testid="link-view-all-orders">
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-16"></div>
                          <div className="h-6 bg-muted rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground">Create your first order to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`text-order-name-${order.id}`}>
                          {order.productName}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-order-platform-${order.id}`}>
                          {order.platform}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium" data-testid={`text-order-amount-${order.id}`}>
                          {formatCurrency(order.orderAmount)}
                        </p>
                        <Badge variant={getStatusBadgeVariant(order.currentStatus)} data-testid={`badge-order-status-${order.id}`}>
                          {order.currentStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics Chart */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Earnings Overview</CardTitle>
                <select className="text-sm border border-border rounded-lg px-3 py-1 bg-background">
                  <option>Last 6 months</option>
                  <option>Last 3 months</option>
                  <option>Last month</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <ChartLine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Interactive earnings chart</p>
                  <p className="text-sm text-muted-foreground mt-2">Showing monthly growth trends and performance metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
