import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { MediatorCard } from "@/components/mediators/mediator-card";
import { MediatorForm } from "@/components/mediators/mediator-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft } from "lucide-react";

export default function Mediators() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showMediatorForm, setShowMediatorForm] = useState(false);
  const [selectedMediator, setSelectedMediator] = useState<any>(null);

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

  const { data: mediators = [], isLoading: mediatorsLoading } = useQuery({
    queryKey: ["/api/mediators"],
    enabled: isAuthenticated,
  });

  const { data: orders = [] } = useQuery({
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

  // Calculate stats for each mediator
  const mediatorsWithStats = (mediators as any[]).map((mediator: any) => {
    const mediatorOrders = (orders as any[]).filter((order: any) => order.mediatorId === mediator.id);
    const activeOrders = mediatorOrders.filter((order: any) =>
      !["Refunded", "Cancelled"].includes(order.currentStatus)
    );
    const refundedOrders = mediatorOrders.filter((order: any) =>
      order.currentStatus === "Refunded"
    );
    
    const totalInvestment = activeOrders.reduce((sum: number, order: any) => sum + order.orderAmount, 0);
    const expectedReturns = activeOrders.reduce((sum: number, order: any) => sum + order.refundAmount, 0);
    const successRate = mediatorOrders.length > 0 
      ? (refundedOrders.length / mediatorOrders.length) * 100 
      : 0;

    return {
      ...mediator,
      stats: {
        activeOrders: activeOrders.length,
        totalInvestment,
        expectedReturns,
        successRate,
      },
    };
  });

  if (mediatorsLoading) {
    return (
      <MainLayout>
        <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold">Mediators</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Manage relationships with your mediators</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-6 card-shadow stagger-item">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 skeleton-shimmer rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 skeleton-shimmer rounded w-24"></div>
                      <div className="h-3 skeleton-shimmer rounded w-20"></div>
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
        </div>
      </MainLayout>
    );
  }

  if (showMediatorForm) {
    return (
      <MainLayout>
        <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold truncate" data-testid="page-title">
                {selectedMediator ? 'Edit Mediator' : 'Add New Mediator'}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {selectedMediator ? 'Update mediator information' : 'Add a new mediator to manage orders'}
              </p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setShowMediatorForm(false);
                setSelectedMediator(null);
              }}
              data-testid="button-back"
              className="ml-2"
            >
              <ArrowLeft className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Back</span>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <MediatorForm
            mediator={selectedMediator}
            onSuccess={() => {
              setShowMediatorForm(false);
              setSelectedMediator(null);
            }}
            onCancel={() => {
              setShowMediatorForm(false);
              setSelectedMediator(null);
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
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-semibold" data-testid="page-title">Mediators</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Manage relationships with your mediators</p>
          </div>
          <Button 
            onClick={() => {
              setSelectedMediator(null);
              setShowMediatorForm(true);
            }}
            data-testid="button-add-mediator"
            size="sm"
            className="ml-2"
          >
            <Plus className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Add Mediator</span>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        {(mediators as any[]).length === 0 ? (
          <div className="text-center py-8 lg:py-12">
            <div className="max-w-md mx-auto px-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <Plus className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold mb-2">No mediators yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first mediator to start managing your orders
              </p>
              <Button 
                onClick={() => {
                  setSelectedMediator(null);
                  setShowMediatorForm(true);
                }}
                data-testid="button-add-first-mediator"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Mediator
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
            {mediatorsWithStats.map((mediator: any, index: number) => (
              <div key={mediator.id} className="stagger-item">
                <MediatorCard
                  mediator={mediator}
                  stats={mediator.stats}
                  onEdit={(mediator) => {
                    setSelectedMediator(mediator);
                    setShowMediatorForm(true);
                  }}
                  onViewOrders={(mediator) => {
                    window.location.href = `/orders?mediatorId=${mediator.id}`;
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
