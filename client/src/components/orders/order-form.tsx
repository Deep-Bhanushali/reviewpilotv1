import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseRupeesToPaise } from "@/lib/currency";
import { isUnauthorizedError } from "@/lib/authUtils";
import { OrderWithRelations } from "@shared/schema";

const orderFormSchema = z.object({
  productName: z.string().min(3, "Product name must be at least 3 characters"),
  platform: z.enum(["Amazon", "Flipkart", "Myntra", "Meesho", "Ajio", "Nykaa", "Paytm Mall", "Snapdeal"]),
  accountId: z.string().min(1, "Please select an account"),
  bankAccountId: z.string().optional(), // Optional bank account for refund
  orderId: z.string().min(1, "Order ID is required"),
  orderAmount: z.number().min(1, "Order amount must be greater than 0"),
  refundAmount: z.number().min(1, "Refund amount must be greater than 0"),
  productLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  mediatorId: z.string().min(1, "Please select a mediator"),
  orderDate: z.string().min(1, "Order date is required"),
  deliveryDate: z.string().optional(),
  refundFormDate: z.string().optional(),
  remindRefundDate: z.string().optional(),
  refundFormLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  comments: z.string().optional(),
  currentStatus: z.enum([
    "Ordered",
    "Delivered",
    "Deliverables Done",
    "Refund Form Done",
    "Overdue Passed for Refund Form",
    "Remind Mediator for Payment",
    "Refunded",
    "Cancelled"
  ]).default("Ordered"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  order?: OrderWithRelations | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string>(order?.platform || "");

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      productName: order?.productName || "",
      platform: order?.platform || undefined,
      accountId: order?.accountId || "",
      bankAccountId: order?.bankAccountId || "",
      orderId: order?.orderId || "",
      orderAmount: order ? order.orderAmount / 100 : 0, // Convert from paise to rupees
      refundAmount: order ? order.refundAmount / 100 : 0, // Convert from paise to rupees
      productLink: order?.productLink || "",
      mediatorId: order?.mediatorId || "",
      orderDate: order?.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryDate: order?.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
      refundFormDate: order?.refundFormDate ? new Date(order.refundFormDate).toISOString().split('T')[0] : "",
      remindRefundDate: order?.remindRefundDate ? new Date(order.remindRefundDate).toISOString().split('T')[0] : "",
      refundFormLink: order?.refundFormLink || "",
      comments: order?.comments || "",
      currentStatus: order?.currentStatus || "Ordered",
    },
  });

  // Fetch mediators
  const { data: mediators = [] } = useQuery({
    queryKey: ["/api/mediators"],
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bank-accounts", "active"],
    queryFn: async () => {
      const response = await fetch("/api/bank-accounts?active=true", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      return response.json();
    },
  });

  // Fetch accounts filtered by platform
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts", selectedPlatform],
    queryFn: async () => {
      const url = selectedPlatform ? `/api/accounts?platform=${selectedPlatform}` : "/api/accounts";
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
    enabled: !!selectedPlatform,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const orderData = {
        ...data,
        orderAmount: parseRupeesToPaise(data.orderAmount),
        refundAmount: parseRupeesToPaise(data.refundAmount),
        // Send dates as strings - the schema will transform them
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || undefined,
        refundFormDate: data.refundFormDate || undefined,
        remindRefundDate: data.remindRefundDate || undefined,
        refundFormLink: data.refundFormLink?.trim() || null,
        comments: data.comments?.trim() || null,
      };
      
      return await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      onSuccess?.();
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
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const orderData = {
        ...data,
        orderAmount: parseRupeesToPaise(data.orderAmount),
        refundAmount: parseRupeesToPaise(data.refundAmount),
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || undefined,
        refundFormDate: data.refundFormDate || undefined,
        remindRefundDate: data.remindRefundDate || undefined,
        refundFormLink: data.refundFormLink?.trim() || null,
        comments: data.comments?.trim() || null,
      };
      
      const res = await apiRequest("PUT", `/api/orders/${order!.id}`, orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
      onSuccess?.();
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
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isEditing = !!order;

  const onSubmit = (data: OrderFormData) => {
    if (isEditing) {
      updateOrderMutation.mutate(data);
    } else {
      createOrderMutation.mutate(data);
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader className="p-4 lg:p-6">
        <CardTitle className="text-lg lg:text-xl">{isEditing ? 'Edit Order' : 'Create New Order'}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 lg:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 lg:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter product name" 
                        {...field} 
                        data-testid="input-product-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPlatform(value);
                        form.setValue("accountId", ""); // Reset account selection
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                        <SelectItem value="Flipkart">Flipkart</SelectItem>
                        <SelectItem value="Myntra">Myntra</SelectItem>
                        <SelectItem value="Meesho">Meesho</SelectItem>
                        <SelectItem value="Ajio">Ajio</SelectItem>
                        <SelectItem value="Nykaa">Nykaa</SelectItem>
                        <SelectItem value="Paytm Mall">Paytm Mall</SelectItem>
                        <SelectItem value="Snapdeal">Snapdeal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Platform order ID" 
                        {...field}
                        data-testid="input-order-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Amount (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-order-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refundAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-refund-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bank-account">
                          <SelectValue placeholder="Select bank account for refund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No bank accounts available
                          </SelectItem>
                        ) : (
                          bankAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName} - {account.bankName} ({account.accountNumber})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mediatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mediator</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-mediator">
                          <SelectValue placeholder="Select mediator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(mediators as any[]).map((mediator: any) => (
                          <SelectItem key={mediator.id} value={mediator.id}>
                            {mediator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-order-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm lg:text-base">Delivery Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-delivery-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refundFormDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm lg:text-base">Refund Form Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-refund-form-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remindRefundDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm lg:text-base">Remind Refund Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-remind-refund-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refundFormLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm lg:text-base">Refund Form Link (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="url" 
                        placeholder="https://example.com/refund-form"
                        {...field}
                        data-testid="input-refund-form-link"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm lg:text-base">Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes or comments about this order..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-comments"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Link (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://..." 
                      {...field}
                      data-testid="input-product-link"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-3 lg:pt-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel} 
                  data-testid="button-cancel"
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
                data-testid="button-submit"
                className="w-full sm:w-auto"
              >
                {(createOrderMutation.isPending || updateOrderMutation.isPending) 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Order" : "Create Order")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
