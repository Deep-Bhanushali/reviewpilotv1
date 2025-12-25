import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { Account } from "@shared/schema";
import { Mail, Phone, Edit } from "lucide-react";

interface AccountCardProps {
  account: Account;
  stats?: {
    activeOrders: number;
    totalInvestment: number;
    pendingAmount: number;
    expectedRefund: number;
  };
  onEdit?: (account: Account) => void;
  onViewOrders?: (account: Account) => void;
}

const platformIcons: Record<string, string> = {
  Amazon: "🛒",
  Flipkart: "🛍️", 
  Myntra: "👗",
  Meesho: "🏪",
  Ajio: "👕",
  Nykaa: "💄",
  "Paytm Mall": "💳",
  Snapdeal: "🛒",
};

const platformColors: Record<string, string> = {
  Amazon: "bg-orange-50 text-orange-600",
  Flipkart: "bg-blue-50 text-blue-600",
  Myntra: "bg-pink-50 text-pink-600",
  Meesho: "bg-purple-50 text-purple-600", 
  Ajio: "bg-indigo-50 text-indigo-600",
  Nykaa: "bg-pink-50 text-pink-600",
  "Paytm Mall": "bg-blue-50 text-blue-600",
  Snapdeal: "bg-red-50 text-red-600",
};

export function AccountCard({ 
  account, 
  stats, 
  onEdit, 
  onViewOrders 
}: AccountCardProps) {
  return (
    <Card className="card-shadow hover-lift h-full" data-testid={`account-card-${account.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 ${platformColors[account.platform] || 'bg-gray-50 text-gray-600'}`}>
              {platformIcons[account.platform] || "🏪"}
            </div>
            <div>
              <h3 className="font-semibold" data-testid={`account-name-${account.id}`}>
                {account.name}
              </h3>
              <Badge variant="secondary" className="transition-colors" data-testid={`account-platform-${account.id}`}>
                {account.platform}
              </Badge>
              <p className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded mt-1 transition-colors" data-testid={`account-id-${account.id}`}>
                ID: {account.id}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="btn-press"
            onClick={() => onEdit?.(account)}
            data-testid={`button-edit-account-${account.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm" data-testid={`account-email-${account.id}`}>
              {account.email}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm" data-testid={`account-phone-${account.id}`}>
              {account.phone}
            </span>
          </div>
          {account.comments && (
            <div className="text-sm text-muted-foreground mt-2" data-testid={`account-comments-${account.id}`}>
              {account.comments}
            </div>
          )}
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Active Orders</p>
              <p className="text-lg font-semibold" data-testid={`account-active-orders-${account.id}`}>
                {stats.activeOrders}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-lg font-semibold text-orange-600" data-testid={`account-pending-amount-${account.id}`}>
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        )}
        
        <Button 
          variant="secondary" 
          className="w-full btn-press"
          onClick={() => onViewOrders?.(account)}
          data-testid={`button-view-account-orders-${account.id}`}
        >
          View Orders
        </Button>
      </CardContent>
    </Card>
  );
}
