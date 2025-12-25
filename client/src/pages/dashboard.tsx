import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { SmartNotifications } from "@/components/dashboard/smart-notifications";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { OrderWithRelations } from "@shared/schema";
import {
  TrendingUp,
  ShoppingCart,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  Wallet
} from "lucide-react";

export default function Dashboard() {
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

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<OrderWithRelations[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold" data-testid="page-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Welcome back, manage your review orders efficiently</p>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        {/* Quick Actions */}
        <QuickActions
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
            <div className="stagger-item">
              <StatsCard
                title="Monthly Earnings"
                value={stats ? formatCurrency((stats as any).monthlyEarnings) : "₹0"}
                subtitle="This month"
                icon={TrendingUp}
                iconColor="text-green-600"
                valueColor="text-green-600"
                trend={{
                  value: "+12% from last month",
                  isPositive: true,
                }}
              />
            </div>
            
            <div className="stagger-item">
              <StatsCard
                title="Active Orders"
                value={(stats as any)?.monthlyOrders || 0}
                subtitle="This month"
                icon={ShoppingCart}
                iconColor="text-blue-600"
              />
            </div>
            
            <div className="stagger-item">
              <StatsCard
                title="Success Rate"
                value="94.2%"
                subtitle="Order completion rate"
                icon={CheckCircle}
                iconColor="text-emerald-600"
              />
            </div>
            
            <div className="stagger-item">
              <StatsCard
                title="Pending Refunds"
                value={stats ? formatCurrency((stats as any).pendingRefunds) : "₹0"}
                subtitle="Awaiting payment"
                icon={Clock}
                iconColor="text-orange-600"
                valueColor="text-orange-600"
              />
            </div>
          </div>

        {/* Lifetime Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-8">
          <div className="stagger-item">
            <StatsCard
              title="Total Investment"
              value={stats ? formatCurrency((stats as any).totalInvestment) : "₹0"}
              subtitle="All time"
              icon={DollarSign}
              iconColor="text-blue-600"
            />
          </div>
          
          <div className="stagger-item">
            <StatsCard
              title="Total Orders"
              value={(stats as any)?.totalOrders || 0}
              subtitle="Lifetime orders"
              icon={Target}
              iconColor="text-purple-600"
            />
          </div>
          
          <div className="stagger-item">
            <StatsCard
              title="Total Pending"
              value={stats ? formatCurrency((stats as any).totalPendingRefund) : "₹0"}
              subtitle="Current pending"
              icon={Wallet}
              iconColor="text-orange-600"
            />
          </div>
        </div>

        {/* Recent Orders and Smart Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          <RecentOrders orders={recentOrders} isLoading={ordersLoading} />
          <SmartNotifications orders={recentOrders} isLoading={ordersLoading} />
        </div>
      </div>
    </MainLayout>
  );
}
