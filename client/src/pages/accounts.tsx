import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountForm } from "@/components/accounts/account-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import type { Account, OrderWithRelations } from "@shared/schema";

const platforms = ["Amazon", "Flipkart", "Myntra", "Meesho", "Ajio", "Nykaa", "Paytm Mall", "Snapdeal"];

export default function Accounts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [filters, setFilters] = useState({
    platform: "",
    search: "",
  });

  // Redirect if not authenticated
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

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/accounts"],
    enabled: isAuthenticated,
  });

  const { data: orders = [] } = useQuery({
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

  if (showAccountForm) {
    return (
      <MainLayout>
        <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold truncate" data-testid="text-page-title">
                {selectedAccount ? "Edit Account" : "Add New Account"}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {selectedAccount ? "Update account information" : "Add a new e-commerce platform account"}
              </p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAccountForm(false);
                setSelectedAccount(null);
              }}
              data-testid="button-back-to-accounts"
              className="ml-2"
            >
              <span className="hidden lg:inline">Back</span>
              <span className="lg:hidden">✕</span>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <AccountForm 
            account={selectedAccount}
            onSuccess={() => {
              setShowAccountForm(false);
              setSelectedAccount(null);
            }}
            onCancel={() => {
              setShowAccountForm(false);
              setSelectedAccount(null);
            }}
          />
        </div>
      </MainLayout>
    );
  }

  // Calculate stats for each account
  const accountsWithStats = accounts.map((account: Account) => {
    const accountOrders = (orders as OrderWithRelations[]).filter(order => order.accountId === account.id);
    const activeOrders = accountOrders.filter(order => 
      !["Refunded", "Cancelled"].includes(order.currentStatus)
    );
    
    const totalInvestment = activeOrders.reduce((sum, order) => sum + order.orderAmount, 0);
    const pendingAmount = activeOrders.reduce((sum, order) => sum + order.refundAmount, 0);
    
    return {
      ...account,
      stats: {
        activeOrders: activeOrders.length,
        totalInvestment,
        pendingAmount,
        expectedRefund: pendingAmount,
      },
    };
  });

  // Filter accounts
  const filteredAccounts = accountsWithStats.filter((account) => {
    const matchesPlatform = !filters.platform || filters.platform === "all" || account.platform === filters.platform;
    const matchesSearch = !filters.search || 
      account.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      account.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      account.phone.includes(filters.search);

    return matchesPlatform && matchesSearch;
  });

  // Sort by active orders (highest first)
  filteredAccounts.sort((a, b) => b.stats.activeOrders - a.stats.activeOrders);

  return (
    <MainLayout>
      <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-semibold" data-testid="text-page-title">E-commerce Accounts</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Manage your platform accounts for orders</p>
          </div>
          <Button 
            onClick={() => setShowAccountForm(true)}
            data-testid="button-add-account"
            size="sm"
            className="ml-2"
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Add Account</span>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 lg:p-6 mb-4 lg:mb-6 card-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger data-testid="filter-platform">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                  data-testid="input-search"
                />
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        {accountsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 card-shadow stagger-item">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 skeleton-shimmer rounded-lg"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 skeleton-shimmer rounded w-24"></div>
                    <div className="h-3 skeleton-shimmer rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 skeleton-shimmer rounded"></div>
                  <div className="h-3 skeleton-shimmer rounded w-3/4"></div>
                  <div className="h-8 skeleton-shimmer rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8 lg:py-12">
            <div className="max-w-md mx-auto px-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <Plus className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold mb-2">
                {accounts.length === 0 ? "No accounts yet" : "No accounts found"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {accounts.length === 0 
                  ? "Add your first e-commerce account to start managing orders"
                  : "Try adjusting your filters or add a new account"
                }
              </p>
              <Button 
                onClick={() => setShowAccountForm(true)}
                data-testid="button-add-first-account"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
            {filteredAccounts.map((account, index) => (
              <div key={account.id} className="stagger-item">
                <AccountCard
                  account={account}
                  stats={account.stats}
                  onEdit={(account) => {
                    setSelectedAccount(account);
                    setShowAccountForm(true);
                  }}
                  onViewOrders={(account) => {
                    // Navigate to orders page with account filter
                    window.location.href = `/orders?accountId=${account.id}`;
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
