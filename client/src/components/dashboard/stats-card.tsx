import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = "text-blue-600",
  valueColor,
  trend 
}: StatsCardProps) {
  return (
    <Card className="card-shadow hover-lift h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1" data-testid={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {title}
            </p>
            <p className={cn("text-2xl font-semibold", valueColor)} data-testid={`stats-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {(subtitle || trend) && (
              <p className="text-xs text-muted-foreground mt-1" data-testid={`stats-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {trend && (
                  <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
                    {trend.value}
                  </span>
                )}
                {trend && subtitle && " • "}
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-transform hover:scale-110", 
            iconColor === "text-green-600" ? "bg-green-50" :
            iconColor === "text-blue-600" ? "bg-blue-50" :
            iconColor === "text-orange-600" ? "bg-orange-50" :
            iconColor === "text-emerald-600" ? "bg-emerald-50" :
            iconColor === "text-purple-600" ? "bg-purple-50" :
            "bg-gray-50"
          )}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { StatsCard };
