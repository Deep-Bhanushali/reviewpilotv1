import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/currency";
import { Mediator } from "@shared/schema";
import { MessageCircle, Edit } from "lucide-react";

interface MediatorCardProps {
  mediator: Mediator;
  stats?: {
    activeOrders: number;
    totalInvestment: number;
    expectedReturns: number;
    successRate: number;
  };
  onEdit?: (mediator: Mediator) => void;
  onViewOrders?: (mediator: Mediator) => void;
  onMessage?: (mediator: Mediator) => void;
}

export function MediatorCard({ 
  mediator, 
  stats, 
  onEdit, 
  onViewOrders, 
  onMessage 
}: MediatorCardProps) {
  const handleWhatsApp = () => {
    const phoneNumber = mediator.whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent("Hi! I wanted to discuss about our orders.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <Card className="card-shadow hover-lift h-full" data-testid={`mediator-card-${mediator.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 transition-transform hover:scale-105">
              <AvatarFallback>
                {mediator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" data-testid={`mediator-name-${mediator.id}`}>
                {mediator.name}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`mediator-phone-${mediator.id}`}>
                {mediator.whatsappNumber}
              </p>
              <p className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded mt-1 transition-colors" data-testid={`mediator-id-${mediator.id}`}>
                ID: {mediator.id}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWhatsApp}
            className="text-green-600 hover:text-green-700 hover:scale-110 transition-transform"
            data-testid={`button-whatsapp-${mediator.id}`}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>
        
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-lg font-semibold" data-testid={`mediator-active-orders-${mediator.id}`}>
                  {stats.activeOrders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-lg font-semibold text-green-600" data-testid={`mediator-success-rate-${mediator.id}`}>
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Investment</span>
                <span className="text-sm font-medium" data-testid={`mediator-investment-${mediator.id}`}>
                  {formatCurrency(stats.totalInvestment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expected Returns</span>
                <span className="text-sm font-medium" data-testid={`mediator-returns-${mediator.id}`}>
                  {formatCurrency(stats.expectedReturns)}
                </span>
              </div>
            </div>
          </>
        )}
        
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            className="flex-1 btn-press"
            onClick={() => onViewOrders?.(mediator)}
            data-testid={`button-view-orders-${mediator.id}`}
          >
            View Orders
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="btn-press"
            onClick={() => onEdit?.(mediator)}
            data-testid={`button-edit-${mediator.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
