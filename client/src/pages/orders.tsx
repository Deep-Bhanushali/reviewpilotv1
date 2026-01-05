import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { OrdersTable } from "@/components/orders/orders-table";
import { OrderForm } from "@/components/orders/order-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft } from "lucide-react";
import { useSearch } from "wouter";

export default function Orders() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Read URL query parameters for initial filter
  const searchParams = useSearch();
  const searchParamsObj = new URLSearchParams(searchParams);
  const initialStatusFilter = searchParamsObj.get('filter') || '';

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

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const { data: mediators = [] } = useQuery({
    queryKey: ["/api/mediators"],
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

  if (showOrderForm || editingOrder) {
    return (
      <MainLayout>
        <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold truncate" data-testid="page-title">
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {editingOrder ? 'Update your review order details' : 'Add a new review order to your system'}
              </p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOrderForm(false);
                setEditingOrder(null);
              }}
              data-testid="button-back-to-orders"
              className="ml-2"
            >
              <ArrowLeft className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Back</span>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <OrderForm 
            order={editingOrder}
            onSuccess={() => {
              setShowOrderForm(false);
              setEditingOrder(null);
            }}
            onCancel={() => {
              setShowOrderForm(false);
              setEditingOrder(null);
            }}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          <div className=" min-w-0">
            <h1 className="text-xl lg:text-2xl font-semibold" data-testid="page-title">Orders Management</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Track and manage all your review orders</p>
          </div>
          <Button 
            onClick={() => setShowOrderForm(true)}
            data-testid="button-new-order"
            size="sm"
            className="ml-2"
          >
            <Plus className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">New Order</span>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <OrdersTable
          orders={orders as any[]}
          mediators={mediators as any[]}
          isLoading={ordersLoading}
          onNewOrder={() => setShowOrderForm(true)}
          onEditOrder={(order) => setEditingOrder(order)}
          initialStatusFilter={initialStatusFilter}
        />
      </div>
    </MainLayout>
  );
}
