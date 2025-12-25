import { Card, CardContent } from "@/components/ui/card";
import { Plus, Star, DollarSign, Calendar } from "lucide-react";
import { Link } from "wouter";

const actions = [
  {
    title: "New Order",
    description: "Create new review order",
    icon: Plus,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    href: "/orders?action=new",
  },
  {
    title: "Submit Review",
    description: "Mark review as complete",
    icon: Star,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    href: "/orders?filter=delivered",
  },
  {
    title: "Request Refund",
    description: "Submit refund form",
    icon: DollarSign,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    href: "/orders?filter=deliverables-done",
  },
];

interface QuickActionsProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
}

export default function QuickActions({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: QuickActionsProps) {
  // Format today's date for the max attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      {/* Date Range Filter Bar */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Date Range (Optional):</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="text-sm text-muted-foreground">From:</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                max={endDate || today}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm text-muted-foreground">To:</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange?.(e.target.value)}
                min={startDate}
                max={today}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {actions.map((action, index) => (
          <Link key={action.title} href={action.href}>
            <Card className={`card-shadow hover-lift cursor-pointer group stagger-item`}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 ${action.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
                    <action.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm lg:text-base" data-testid={`quick-action-title-${action.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {action.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-muted-foreground truncate" data-testid={`quick-action-description-${action.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export { QuickActions };
