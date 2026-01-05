import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import { OrderWithRelations } from "@shared/schema";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

import {
  Search,
  Eye,
  Edit2,
  ExternalLink,
  Copy,
  MoreVertical,
} from "lucide-react";
import { CreateEventButton } from "@/components/calendar/create-event-button";
import { WhatsappLink } from "@/components/orders/whatsapp-link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface OrdersTableProps {
  orders: OrderWithRelations[];
  mediators: any[];
  isLoading?: boolean;
  onNewOrder?: () => void;
  onEditOrder?: (order: OrderWithRelations) => void;
  initialStatusFilter?: string;
}

const statusColors = {
  Ordered: "bg-blue-50 text-blue-700",
  Delivered: "bg-green-50 text-green-700",
  "Deliverables Done": "bg-purple-50 text-purple-700",
  "Refund Form Done": "bg-indigo-50 text-indigo-700",
  "Overdue Passed for Refund Form": "bg-red-50 text-red-700",
  "Remind Mediator for Payment": "bg-orange-50 text-orange-700",
  Refunded: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-gray-50 text-gray-700",
};

const platforms = [
  "Amazon",
  "Flipkart",
  "Myntra",
  "Meesho",
  "Ajio",
  "Nykaa",
  "Paytm Mall",
  "Snapdeal",
];

const orderStatuses = [
  "Ordered",
  "Delivered",
  "Deliverables Done",
  "Refund Form Done",
  "Overdue Passed for Refund Form",
  "Remind Mediator for Payment",
  "Refunded",
  "Cancelled",
];

export function OrdersTable({
  orders,
  mediators,
  isLoading,
  onNewOrder,
  onEditOrder,
  initialStatusFilter,
}: OrdersTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: initialStatusFilter || "",
    platform: "",
    mediatorId: "",
    search: "",
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(
    null
  );
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const res = await apiRequest("PUT", `/api/orders/${orderId}`, {
        currentStatus: newStatus,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
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
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      !filters.status ||
      filters.status === "all" ||
      order.currentStatus === filters.status;
    const matchesPlatform =
      !filters.platform ||
      filters.platform === "all" ||
      order.platform === filters.platform;
    const matchesMediator =
      !filters.mediatorId ||
      filters.mediatorId === "all" ||
      order.mediatorId === filters.mediatorId;
    const matchesSearch =
      !filters.search ||
      order.productName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.orderId.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesPlatform && matchesMediator && matchesSearch;
  });

  const calculateProfit = (order: OrderWithRelations) => {
    const profit = order.refundAmount - order.orderAmount;
    return {
      amount: profit,
      isPositive: profit >= 0,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="card-shadow animate-pulse">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded animate-pulse"
                ></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 w-full">
            <div>
              <label className="block text-sm font-medium mb-2 ">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.keys(statusColors).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <Select
                value={filters.platform}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger data-testid="filter-platform">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mediator</label>
              <Select
                value={filters.mediatorId}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, mediatorId: value }))
                }
              >
                <SelectTrigger data-testid="filter-mediator">
                  <SelectValue placeholder="All Mediators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mediators</SelectItem>
                  {mediators.map((mediator) => (
                    <SelectItem key={mediator.id} value={mediator.id}>
                      {mediator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Input
                  placeholder="Search orders..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                  data-testid="input-search"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No orders found</p>
              <p className="text-sm mt-1">
                {orders.length === 0
                  ? "Create your first order to get started"
                  : "Try adjusting your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const profit = calculateProfit(order);
            return (
              <Card
                key={order.id}
                className="card-shadow"
                data-testid={`order-card-${order.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-base truncate"
                        data-testid={`order-product-${order.id}`}
                      >
                        {order.productName}
                      </h3>
                      <p
                        className="text-xs text-muted-foreground font-mono"
                        data-testid={`order-id-${order.id}`}
                      >
                        {order.orderId}
                      </p>
                    </div>
                    <Select
                      value={order.currentStatus}
                      onValueChange={(value) => {
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          newStatus: value,
                        });
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-auto h-auto p-1">
                        <SelectValue>
                          <Badge
                            className={
                              statusColors[
                                order.currentStatus as keyof typeof statusColors
                              ]
                            }
                            data-testid={`order-status-${order.id}`}
                          >
                            {order.currentStatus}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            <Badge
                              className={
                                statusColors[
                                  status as keyof typeof statusColors
                                ]
                              }
                            >
                              {status}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Platform
                      </span>
                      <p
                        className="font-medium"
                        data-testid={`order-platform-${order.id}`}
                      >
                        {order.platform}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Mediator
                      </span>
                      <p
                        className="font-medium truncate"
                        data-testid={`order-mediator-${order.id}`}
                      >
                        {order.mediator.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Order Amount
                      </span>
                      <p
                        className="font-semibold text-blue-600"
                        data-testid={`order-amount-${order.id}`}
                      >
                        {formatCurrency(order.orderAmount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Refund Amount
                      </span>
                      <p
                        className="font-semibold text-green-600"
                        data-testid={`order-refund-${order.id}`}
                      >
                        {formatCurrency(order.refundAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Profit/Loss */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground text-xs">
                        Profit/Loss
                      </span>
                      <p
                        className={`font-semibold text-sm ${
                          profit.isPositive ? "text-green-600" : "text-red-600"
                        }`}
                        data-testid={`order-profit-${order.id}`}
                      >
                        {profit.isPositive ? "+" : "-"}
                        {formatCurrency(Math.abs(profit.amount))}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <WhatsappLink order={order} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        data-testid={`button-view-${order.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditOrder?.(order)}
                        data-testid={`button-edit-${order.id}`}
                      >
                        <Edit2 className="w-4 h-4 mx-auto" />
                      </Button>
                      <CreateEventButton order={order} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="card-shadow hidden lg:block w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            {onNewOrder && (
              <Button onClick={onNewOrder} data-testid="button-new-order">
                New Order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No orders found</p>
              <p className="text-sm mt-1">
                {orders.length === 0
                  ? "Create your first order to get started"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Mediator</TableHead>
                    <TableHead>Order Amount</TableHead>
                    <TableHead>Refund Amount</TableHead>
                    <TableHead>Profit/Loss</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const profit = calculateProfit(order);
                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-muted/20 overflow-auto"
                        data-testid={`order-row-${order.id}`}
                      >
                        <TableCell>
                          <div>
                            <p
                              className="font-medium"
                              data-testid={`order-product-${order.id}`}
                            >
                              {order.productName}
                            </p>
                            <p
                              className="text-sm text-muted-foreground"
                              data-testid={`order-id-${order.id}`}
                            >
                              {order.orderId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`order-platform-${order.id}`}>
                          {order.platform}
                        </TableCell>
                        <TableCell data-testid={`order-mediator-${order.id}`}>
                          {order.mediator.name}
                        </TableCell>
                        <TableCell
                          className="font-medium"
                          data-testid={`order-amount-${order.id}`}
                        >
                          {formatCurrency(order.orderAmount)}
                        </TableCell>
                        <TableCell
                          className="font-medium"
                          data-testid={`order-refund-${order.id}`}
                        >
                          {formatCurrency(order.refundAmount)}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            profit.isPositive
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                          data-testid={`order-profit-${order.id}`}
                        >
                          {formatCurrency(Math.abs(profit.amount))}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.currentStatus}
                            onValueChange={(value) => {
                              updateStatusMutation.mutate({
                                orderId: order.id,
                                newStatus: value,
                              });
                            }}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-auto h-auto p-1">
                              <SelectValue>
                                <Badge
                                  className={
                                    statusColors[
                                      order.currentStatus as keyof typeof statusColors
                                    ]
                                  }
                                  data-testid={`order-status-${order.id}`}
                                >
                                  {order.currentStatus}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  <Badge
                                    className={
                                      statusColors[
                                        status as keyof typeof statusColors
                                      ]
                                    }
                                  >
                                    {status}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();

                                // TOGGLE
                                if (openMenuId === order.id) {
                                  setOpenMenuId(null);
                                  return;
                                }

                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.right + window.scrollX,
                                });

                                setOpenMenuId(order.id);
                              }}
                              className="p-2 rounded hover:bg-gray-100"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openMenuId === order.id &&
                              createPortal(
                                <div
                                  ref={menuRef}
                                  className="fixed z-[9999] w-44 bg-white border rounded-md shadow-lg"
                                  style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left - 176,
                                  }}
                                >
                                  <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                                    <WhatsappLink order={order} />
                                  </div>

                                  <button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowOrderDetails(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                                  >
                                    <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                    View
                                  </button>

                                  <button
                                    onClick={() => {
                                      onEditOrder?.(order);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                                  >
                                    <Edit2 className="w-4 h-4 mr-2 text-green-600" />
                                    Edit
                                  </button>

                                  <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                                    <CreateEventButton order={order} />
                                  </div>
                                </div>,
                                document.body
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid gap-6">
              {/* Product Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Product Name
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedOrder.productName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Platform
                  </label>
                  <p className="text-lg">{selectedOrder.platform}</p>
                </div>
              </div>

              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Order ID
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono">{selectedOrder.orderId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.orderId);
                        toast({
                          title: "Copied!",
                          description: "Order ID copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        statusColors[
                          selectedOrder.currentStatus as keyof typeof statusColors
                        ]
                      }
                    >
                      {selectedOrder.currentStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Order Amount
                  </label>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(selectedOrder.orderAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Refund Amount
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedOrder.refundAmount)}
                  </p>
                </div>
              </div>

              {/* Account & Mediator */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Account
                  </label>
                  <p className="text-lg">{selectedOrder.account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.account.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Mediator
                  </label>
                  <p className="text-lg">{selectedOrder.mediator.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.mediator.whatsappNumber}
                  </p>
                  <div className="mt-2">
                    <WhatsappLink order={selectedOrder} />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Order Date
                  </label>
                  <p className="text-lg">
                    {new Date(selectedOrder.orderDate).toLocaleDateString()}
                  </p>
                </div>
                {selectedOrder.deliveryDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Delivery Date
                    </label>
                    <p className="text-lg">
                      {new Date(
                        selectedOrder.deliveryDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedOrder.refundFormDate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Refund Form Date
                    </label>
                    <p className="text-lg">
                      {new Date(
                        selectedOrder.refundFormDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedOrder.remindRefundDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Remind Refund Date
                      </label>
                      <p className="text-lg">
                        {new Date(
                          selectedOrder.remindRefundDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Product Link */}
              {selectedOrder.productLink && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Product Link
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        selectedOrder.productLink &&
                        window.open(selectedOrder.productLink, "_blank")
                      }
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Product
                    </Button>
                  </div>
                </div>
              )}

              {/* Refund Form Link */}
              {selectedOrder.refundFormLink && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Refund Form Link
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        selectedOrder.refundFormLink &&
                        window.open(selectedOrder.refundFormLink, "_blank")
                      }
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Refund Form
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments */}
              {selectedOrder.comments && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Comments
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mt-1">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedOrder.comments}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOrderDetails(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowOrderDetails(false);
                if (selectedOrder) {
                  onEditOrder?.(selectedOrder);
                }
              }}
            >
              Edit Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
