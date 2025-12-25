import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Mediator } from "@shared/schema";

const mediatorFormSchema = z.object({
  name: z.string().min(3, "Mediator name must be at least 3 characters"),
  whatsappNumber: z.string()
    .min(10, "Please enter a valid WhatsApp number")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with country code"),
});

type MediatorFormData = z.infer<typeof mediatorFormSchema>;

interface MediatorFormProps {
  mediator?: Mediator | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MediatorForm({ mediator, onSuccess, onCancel }: MediatorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!mediator;

  const form = useForm<MediatorFormData>({
    resolver: zodResolver(mediatorFormSchema),
    defaultValues: {
      name: mediator?.name || "",
      whatsappNumber: mediator?.whatsappNumber || "",
    },
  });

  const createMediatorMutation = useMutation({
    mutationFn: async (data: MediatorFormData) => {
      return await apiRequest("POST", "/api/mediators", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mediators"] });
      toast({
        title: "Success",
        description: "Mediator created successfully",
      });
      form.reset();
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
        description: "Failed to create mediator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMediatorMutation = useMutation({
    mutationFn: async (data: MediatorFormData) => {
      return await apiRequest("PUT", `/api/mediators/${mediator!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mediators"] });
      toast({
        title: "Success",
        description: "Mediator updated successfully",
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
        description: "Failed to update mediator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMediatorMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/mediators/${mediator!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mediators"] });
      toast({
        title: "Success",
        description: "Mediator deleted successfully",
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
        description: "Failed to delete mediator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MediatorFormData) => {
    if (isEditing) {
      updateMediatorMutation.mutate(data);
    } else {
      createMediatorMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this mediator? This action cannot be undone.")) {
      deleteMediatorMutation.mutate();
    }
  };

  const isSubmitting = createMediatorMutation.isPending || updateMediatorMutation.isPending;

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Mediator" : "Add New Mediator"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mediator Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter mediator's business name" 
                      {...field} 
                      data-testid="input-mediator-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+91 9876543210" 
                      {...field} 
                      data-testid="input-whatsapp-number"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +91 for India)
                  </p>
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
                    Cancel
                  </Button>
                )}
                
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={deleteMediatorMutation.isPending}
                    data-testid="button-delete-mediator"
                  >
                    {deleteMediatorMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Mediator" : "Create Mediator")
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
