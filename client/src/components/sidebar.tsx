import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  CreditCard,
  Bell,
  Settings,
  Star,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Mediators", href: "/mediators", icon: Users },
  { name: "Accounts", href: "/accounts", icon: CreditCard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, refetch } = useAuth();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      // Clear ALL cached queries BEFORE fetching
      queryClient.clear();

      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('Logout successful');
        // Redirect to home page to ensure clean state
        window.location.href = '/';
      } else {
        console.error('Logout failed:', response.status);
        window.location.href = '/';
      }

    } catch (error) {
      console.error('Logout failed:', error);
      // Even on error, ensure clean state
      window.location.href = '/';
    }
  };

  return (
    <aside className="w-60 bg-card border-r border-border fixed h-full left-0 top-0 overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">ReviewSystem</h1>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl} alt="User avatar" />
            <AvatarFallback>
              {((user?.firstName?.[0] ?? (user?.email as string)?.[0]) ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : (user?.email as string) || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="user-email">
              {(user?.email as string) ?? ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
