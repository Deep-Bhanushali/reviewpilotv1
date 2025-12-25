import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle, Info, Calendar, Search } from "lucide-react";
import type { NotificationWithOrder } from "@shared/schema";

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    type: "",
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

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NotificationWithOrder[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Load user settings for message templates
  const { data: userSettings } = useQuery({
    queryKey: ["/api/user-settings"],
    enabled: isAuthenticated,
  });

  // Handle messaging mediator - generates WhatsApp URL
  const handleMessageMediator = (orderId: string) => {
    const notification = notifications.find(n => n.order?.id === orderId);
    if (!notification?.order) {
      toast({
        title: "Error",
        description: "Order information not found",
        variant: "destructive",
      });
      return;
    }

    const order = notification.order as any; // Type assertion since notification order includes relations
    const mediator = order.mediator;
    
    if (!mediator?.whatsappNumber) {
      toast({
        title: "Error", 
        description: "Mediator WhatsApp number not found",
        variant: "destructive",
      });
      return;
    }

    // Get message template from settings or use default
    const templates = (userSettings as any)?.messageTemplates ? 
      JSON.parse((userSettings as any).messageTemplates) : { selectedTemplate: 'default' };
    
    // Generate message based on notification type and order status
    let message = `Hi ${mediator.name}! Regarding order: ${order.productName}\n` +
                  `Order ID: ${order.orderId}\n` +
                  `Platform: ${order.platform}\n` +
                  `Current Status: ${order.currentStatus}`;

    // Add specific context based on notification type
    if (notification.type === "Critical") {
      message += `\n⚠️ URGENT: ${notification.message}`;
    } else {
      message += `\n📝 ${notification.message}`;
    }

    // Clean phone number and create WhatsApp URL
    const phoneNumber = mediator.whatsappNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp with pre-filled message
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Opening WhatsApp",
      description: `Message prepared for ${mediator.name}`,
    });
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate notification stats
  const totalNotifications = notifications.length;
  const unreadNotifications = notifications.filter((n) => n.isRead === 0).length;
  const criticalNotifications = notifications.filter((n) => n.type === "Critical").length;
  const todayNotifications = notifications.filter((n) => {
    const today = new Date().toDateString();
    return n.createdAt ? new Date(n.createdAt).toDateString() === today : false;
  }).length;

  // Filter notifications
  const filteredNotifications = notifications.filter((notification: NotificationWithOrder) => {
    const matchesType = !filters.type || filters.type === "all" || 
      (filters.type === "unread" && notification.isRead === 0) ||
      (filters.type === "critical" && notification.type === "Critical") ||
      (filters.type === "today" && notification.createdAt && new Date(notification.createdAt).toDateString() === new Date().toDateString()) ||
      (filters.type !== "unread" && filters.type !== "critical" && filters.type !== "today" && notification.type === filters.type);
      
    const matchesSearch = !filters.search || 
      notification.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      notification.message.toLowerCase().includes(filters.search.toLowerCase());

    return matchesType && matchesSearch;
  });

  const handleMarkRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleViewOrder = (orderId: string) => {
    toast({
      title: "View Order",
      description: "Redirecting to order details...",
    });
    // Here you would typically navigate to the order detail page
  };


  return (
    <MainLayout>
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with order status and payment alerts</p>
          </div>
          <Button 
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markAllAsReadMutation.isPending || unreadNotifications === 0}
            data-testid="button-mark-all-read"
          >
            {markAllAsReadMutation.isPending ? "Marking..." : "Mark all as read"}
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold" data-testid="stats-total">{totalNotifications}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-semibold text-orange-600" data-testid="stats-unread">{unreadNotifications}</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Badge className="w-5 h-5 text-orange-600 bg-transparent border-none p-0">●</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-semibold text-red-600" data-testid="stats-critical">{criticalNotifications}</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-semibold text-green-600" data-testid="stats-today">{todayNotifications}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-shadow mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Filter by Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger data-testid="filter-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="Critical">Critical Alerts</SelectItem>
                    <SelectItem value="Warning">Warnings</SelectItem>
                    <SelectItem value="Success">Success</SelectItem>
                    <SelectItem value="Info">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search notifications..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                    data-testid="input-search"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notifications ({filteredNotifications.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notificationsLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-6 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {notifications.length === 0 ? "No notifications yet" : "No notifications found"}
                </h3>
                <p className="text-muted-foreground">
                  {notifications.length === 0 
                    ? "You'll see notifications here when there are updates to your orders"
                    : "Try adjusting your filters to see more notifications"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification: NotificationWithOrder) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onViewOrder={handleViewOrder}
                    onMessageMediator={handleMessageMediator}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
