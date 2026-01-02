import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ChartLine,
  ShoppingCart,
  Users,
  CreditCard,
  Bell,
  Activity,
  Settings,
  Star,
  LogOut,
  Menu,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  { path: "/", icon: ChartLine, label: "Dashboard" },
  { path: "/orders", icon: ShoppingCart, label: "Orders" },
  { path: "/mediators", icon: Users, label: "Mediators" },
  { path: "/accounts", icon: CreditCard, label: "E-Commerce Accounts" },
  { path: "/bank-accounts", icon: Building2, label: "Bank Accounts" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/activity-log", icon: Activity, label: "Activity Log" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Star className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">ReviewSystem</h1>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onNavigate}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border bg-card">
        <div className="flex items-center space-x-3">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32&q=80"} 
            alt="User avatar" 
            className="w-8 h-8 rounded-full object-cover"
            data-testid="img-user-avatar"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email?.split('@')[0] || 'User'
              }
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                const response = await fetch('/api/logout', {
                  method: 'POST',
                  credentials: 'include',
                });

                if (response.ok) {
                  // Clear query client cache
                  window.location.href = '/';
                } else {
                  console.error('Logout failed');
                }
              } catch (error) {
                console.error('Logout error:', error);
              }
            }}
            data-testid="button-logout"
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2">
      {menuItems.slice(0, 4).map((item) => {
        const isActive = location === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            data-testid={`bottom-nav-${item.label.toLowerCase()}`}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px]",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 bg-card border-r border-border fixed h-full left-0 top-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Header with Hamburger */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center space-x-2 ml-3">
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
            <Star className="h-3 w-3 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">ReviewSystem</h1>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      {/* <BottomNav /> */}
    </>
  );
}
