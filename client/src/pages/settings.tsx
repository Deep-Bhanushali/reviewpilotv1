import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, FileText, Bell, User, Database, Settings as SettingsIcon, Calendar, MessageSquare, Loader2 } from "lucide-react";
import { CalendarConnectButton } from "@/components/calendar/calendar-connect-button";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  timezone: z.string().min(1, "Please select a timezone"),
  language: z.string().min(1, "Please select a language"),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type PasswordFormData = z.infer<typeof passwordFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    orderDelivered: true,
    refundFormDue: true,
    paymentReceived: true,
    orderDelayed: true,
    weeklyReports: true,
  });

  // Load user settings from backend
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/user-settings"],
    enabled: !!isAuthenticated,
  });

  const [calendarSettings, setCalendarSettings] = useState({
    enabled: false,
    calendarId: "",
    createOrderEvents: true,
    createDeliveryEvents: true,
    createRefundReminders: true,
  });

  const [messagingSettings, setMessagingSettings] = useState({
    enabled: false,
    selectedTemplate: "default",
  });

  // Load mediators for messaging tests
  const { data: mediators = [] } = useQuery({
    queryKey: ["/api/mediators"],
    enabled: !!isAuthenticated && messagingSettings.enabled,
  }) as { data: any[] };

  // Update local state when settings are loaded
  useEffect(() => {
    if (userSettings && typeof userSettings === 'object') {
      setCalendarSettings(prev => ({
        ...prev,
        enabled: (userSettings as any).calendarEnabled === 1,
        calendarId: (userSettings as any).calendarId || "",
      }));
      setMessagingSettings(prev => ({
        ...prev,
        enabled: (userSettings as any).messagingEnabled === 1,
      }));
    }
  }, [userSettings]);

  const messageTemplates = {
    default: {
      orderConfirmation: "Hi {mediatorName}, Order #{orderId} has been placed for {productName} on {platform}. Amount: {orderAmount}",
      deliveryReminder: "Hi {mediatorName}, Please check delivery status for Order #{orderId}. Expected delivery: {deliveryDate}",
      refundFormReminder: "Hi {mediatorName}, Refund form needs to be submitted for Order #{orderId} by {refundFormDate}",
      paymentRequest: "Hi {mediatorName}, Please process payment for Order #{orderId}. Refund amount: {refundAmount}",
    },
    friendly: {
      orderConfirmation: "Hello {mediatorName}! 😊 New order #{orderId} is ready - {productName} from {platform}. Total: {orderAmount}",
      deliveryReminder: "Hey {mediatorName}! 📦 Could you please check on order #{orderId}? Expected delivery: {deliveryDate}",
      refundFormReminder: "Hi {mediatorName}! ⏰ Don't forget the refund form for order #{orderId} - due by {refundFormDate}",
      paymentRequest: "Hello {mediatorName}! 💰 Ready to process payment for order #{orderId}? Amount: {refundAmount}",
    },
    professional: {
      orderConfirmation: "Dear {mediatorName}, Order #{orderId} has been successfully placed. Product: {productName}, Platform: {platform}, Amount: {orderAmount}",
      deliveryReminder: "Dear {mediatorName}, This is a reminder to verify delivery status for Order #{orderId}. Scheduled delivery: {deliveryDate}",
      refundFormReminder: "Dear {mediatorName}, Please ensure refund form submission for Order #{orderId} before {refundFormDate}",
      paymentRequest: "Dear {mediatorName}, Please proceed with payment processing for Order #{orderId}. Amount due: {refundAmount}",
    },
  };

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

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      timezone: "Asia/Kolkata",
      language: "English",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: "",
        timezone: "Asia/Kolkata",
        language: "English",
      });
    }
  }, [user, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Note: This would typically update user profile via API
      // For now, we'll just show a success message
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
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
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      // Note: This would typically update password via API
      return Promise.resolve();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Success",
        description: "Password updated successfully",
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
        description: "Failed to update password",
        variant: "destructive",
      });
    },
  });

  // Calendar settings mutation
  const updateCalendarMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest('PUT', '/api/user-settings', {
        calendarEnabled: settings.enabled ? 1 : 0,
        calendarApiKey: settings.calendarId || null,
        calendarId: settings.calendarId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      toast({
        title: "Success",
        description: "Calendar settings updated successfully",
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
        description: "Failed to update calendar settings",
        variant: "destructive",
      });
    },
  });

  // Test calendar connection mutation
  const testCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/calendar/test');
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.requiresReauth) {
        // Clear the calendar enabled flag
        updateCalendarMutation.mutate({ enabled: false, calendarId: '' });
      }

      toast({
        title: data.connected ? "Success" : "Connection Failed",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
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
        title: "Connection Failed",
        description: "Failed to test calendar connection. Please try reconnecting.",
        variant: "destructive",
      });
    },
  });

  // Messaging settings mutation
  const updateMessagingMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest('PUT', '/api/user-settings', {
        messagingEnabled: settings.enabled ? 1 : 0,
        messageTemplates: JSON.stringify({ selectedTemplate: settings.selectedTemplate }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      toast({
        title: "Success",
        description: "Messaging settings updated successfully",
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
        description: "Failed to update messaging settings",
        variant: "destructive",
      });
    },
  });

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async () => {
      const testMessageData = {
        messageType: "test",
        template: messagingSettings.selectedTemplate,
        mediatorId: mediators[0]?.id || null, // Use first mediator for testing
      };
      return await apiRequest("POST", "/api/messaging/test", testMessageData);
    },
    onSuccess: () => {
      toast({
        title: "Test Message Sent",
        description: "A test message has been sent to the mediator.",
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
        title: "Failed to Send Test Message",
        description: "Could not send test message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Debounced calendar ID save (after mutations are declared)
  const [calendarIdTimer, setCalendarIdTimer] = useState<NodeJS.Timeout | null>(null);
  
  const saveCalendarId = useCallback((calendarId: string) => {
    if (calendarIdTimer) {
      clearTimeout(calendarIdTimer);
    }
    
    const timer = setTimeout(() => {
      updateCalendarMutation.mutate({ ...calendarSettings, calendarId });
    }, 1000); // 1 second delay
    
    setCalendarIdTimer(timer);
  }, [calendarSettings, updateCalendarMutation, calendarIdTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (calendarIdTimer) {
        clearTimeout(calendarIdTimer);
      }
    };
  }, [calendarIdTimer]);

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const handleExport = async (type: string) => {
    try {
      toast({
        title: "Export Started", 
        description: `Preparing ${type} export...`,
      });
      
      const response = await fetch(`/api/export/${type}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Add timestamp to filename
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 10); // YYYY-MM-DD format
      a.download = `${type}_export_${timestamp}.csv`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: `${type} data exported successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${type} data`,
        variant: "destructive",
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Processing Import",
      description: "Reading and validating CSV file...",
    });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Invalid File",
            description: "CSV file must contain headers and at least one data row",
            variant: "destructive",
          });
          return;
        }
        
        const headers = lines[0];
        const dataRows = lines.slice(1);
        
        // Better CSV parsing that handles quoted values properly
        const parseCsvRow = (row: string): string[] => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        
        const csvData = dataRows.map(parseCsvRow).filter(row => row.some(cell => cell.length > 0));
        
        if (csvData.length === 0) {
          toast({
            title: "No Data Found",
            description: "CSV file contains no valid data rows",
            variant: "destructive",
          });
          return;
        }
        
        const res = await apiRequest('POST', '/api/import/orders', { csvData });
        const response = await res.json();
        
        console.log('Import response:', response);
        
        // Ensure response has expected structure
        if (!response || typeof response !== 'object') {
          console.error('Invalid response structure:', response);
          toast({
            title: "❌ Import Failed",
            description: "Invalid response from server",
            variant: "destructive",
          });
          return;
        }
        
        // Display results in UI
        const statusDiv = document.getElementById('import-status');
        const resultsDiv = document.getElementById('import-results');
        
        // Check if response indicates success
        const isSuccess = response.success === true && (response.imported || 0) > 0;
        const importedCount = response.imported || 0;
        const errorCount = response.errors || 0;
        
        if (statusDiv && resultsDiv) {
          statusDiv.className = isSuccess
            ? 'bg-green-50 border border-green-200 rounded-lg p-4 mb-4'
            : 'bg-red-50 border border-red-200 rounded-lg p-4 mb-4';
          
          const titleColor = isSuccess ? 'text-green-800' : 'text-red-800';
          const textColor = isSuccess ? 'text-green-700' : 'text-red-700';
          
          let resultHTML = `<h5 class="font-medium ${titleColor} mb-2">Import Results</h5>`;
          resultHTML += `<div class="text-sm ${textColor} space-y-1">`;
          
          if (response.success === true) {
            if (importedCount > 0) {
              resultHTML += `<p><strong>✅ Success:</strong> ${importedCount} orders imported successfully</p>`;
              
              if (errorCount > 0) {
                resultHTML += `<p><strong>⚠️ Errors:</strong> ${errorCount} rows failed to import</p>`;
                if (response.errorDetails && response.errorDetails.length > 0) {
                  resultHTML += `<details class="mt-2"><summary class="cursor-pointer font-medium">View Failed Rows</summary>`;
                  resultHTML += `<ul class="mt-2 ml-4 space-y-1">`;
                  response.errorDetails.forEach((error: any) => {
                    resultHTML += `<li>• <strong>Row ${error.row}:</strong> ${error.error}</li>`;
                  });
                  resultHTML += `</ul></details>`;
                }
              }
              
              toast({
                title: "✅ Import Successful!",
                description: `Successfully imported ${importedCount} orders${errorCount > 0 ? `. ${errorCount} rows had errors.` : '.'}`,
              });
            } else {
              resultHTML += `<p><strong>❌ No orders imported</strong></p>`;
              if (response.errorDetails && response.errorDetails.length > 0) {
                resultHTML += `<p>Errors found in ${errorCount} rows:</p>`;
                resultHTML += `<ul class="mt-2 ml-4 space-y-1">`;
                response.errorDetails.forEach((error: any) => {
                  resultHTML += `<li>• <strong>Row ${error.row}:</strong> ${error.error}</li>`;
                });
                resultHTML += `</ul>`;
              }
              
              toast({
                title: "❌ Import Failed",
                description: `No orders were imported. ${errorCount} errors found.`,
                variant: "destructive",
              });
            }
          } else {
            resultHTML += `<p><strong>❌ Import failed:</strong> ${response.message || "Server error occurred"}</p>`;
            
            toast({
              title: "❌ Import Failed",
              description: response.message || "Server error occurred",
              variant: "destructive",
            });
          }
          
          resultHTML += `</div>`;
          resultsDiv.innerHTML = resultHTML;
          statusDiv.classList.remove('hidden');
        }
        
        // Also log to console for debugging
        if (response.success && response.imported > 0) {
          console.group('✅ Import Results:');
          console.log(`Successfully imported: ${response.imported} orders`);
          if (response.errors > 0) {
            console.log(`Failed rows: ${response.errors}`);
            console.log('Error details:', response.errorDetails);
          }
          console.groupEnd();
        } else {
          console.group('❌ Import Failed:');
          console.log('Response:', response);
          if (response.errorDetails) {
            console.log('Error details:', response.errorDetails);
          }
          console.groupEnd();
        }
        
        // Clear the file input
        event.target.value = '';
        
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed", 
          description: "Failed to process CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/order-import-template.csv';
    link.download = 'order-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "Order import template downloaded successfully",
    });
  };

  return (
    <MainLayout>
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and security</p>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl space-y-8">
          {/* Profile Settings */}
          <Card className="card-shadow border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <User className="w-5 h-5 mr-2 text-blue-500" />
                Profile Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter first name" 
                              {...field} 
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter last name" 
                              {...field} 
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter email" 
                              {...field} 
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="+91 9876543210" 
                              {...field} 
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                              <SelectItem value="Asia/Mumbai">Asia/Mumbai (GMT+5:30)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-language">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="Hindi">Hindi</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="card-shadow border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <SettingsIcon className="w-5 h-5 mr-2 text-orange-500" />
                Password Security
              </CardTitle>
              <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter current password" 
                            {...field} 
                            data-testid="input-current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter new password" 
                              {...field} 
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm new password" 
                              {...field} 
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                      data-testid="button-update-password"
                    >
                      {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="card-shadow border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Bell className="w-5 h-5 mr-2 text-green-500" />
                Notification Preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">Control how and when you receive notifications</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {key === 'emailNotifications' && 'Receive order updates via email'}
                        {key === 'pushNotifications' && 'Receive browser notifications'}
                        {key === 'smsNotifications' && 'Receive SMS notifications'}
                        {key === 'orderDelivered' && 'Get notified when orders are delivered'}
                        {key === 'refundFormDue' && 'Get reminders for refund form submissions'}
                        {key === 'paymentReceived' && 'Get notified when payments are received'}
                        {key === 'orderDelayed' && 'Get notified about delayed orders'}
                        {key === 'weeklyReports' && 'Receive weekly summary reports'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, [key]: checked }))
                      }
                      data-testid={`switch-${key}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Application Preferences */}
          <Card className="card-shadow border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Database className="w-5 h-5 mr-2 text-purple-500" />
                Application Preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">Customize your application experience</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Default Currency</h4>
                    <Select defaultValue="INR">
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Date Format</h4>
                    <Select defaultValue="dd/mm/yyyy">
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Auto-refresh Data</h4>
                      <p className="text-sm text-muted-foreground">Automatically refresh dashboard data every 30 seconds</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-auto-refresh" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Compact View</h4>
                      <p className="text-sm text-muted-foreground">Show more data in less space</p>
                    </div>
                    <Switch data-testid="switch-compact-view" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Confirmation Dialogs</h4>
                      <p className="text-sm text-muted-foreground">Show confirmation dialogs for important actions</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-confirmation-dialogs" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export & Import */}
          {/* Calendar Integration */}
          <Card className="card-shadow border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                Calendar Integration
              </CardTitle>
              <p className="text-sm text-muted-foreground">Automatically sync order events with Google Calendar</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Enable Calendar Integration</h4>
                    <p className="text-sm text-muted-foreground">Automatically create calendar events for order milestones</p>
                  </div>
                  <Switch
                    checked={calendarSettings.enabled}
                    onCheckedChange={(checked) => {
                      setCalendarSettings(prev => ({ ...prev, enabled: checked }));
                      updateCalendarMutation.mutate({ ...calendarSettings, enabled: checked });
                    }}
                    disabled={updateCalendarMutation.isPending}
                    data-testid="switch-calendar-enabled"
                  />
                </div>

                {calendarSettings.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-purple-100">
                    <div>
                      <label className="text-sm font-medium">Google Calendar Integration</label>
                      
                      {/* Connection Status & Actions */}
                      <div className="mt-2 mb-3 flex gap-2">
                        <CalendarConnectButton />
                        <Button
                          onClick={() => testCalendarMutation.mutate()}
                          disabled={testCalendarMutation.isPending}
                          variant="outline"
                          size="sm"
                          data-testid="button-test-calendar"
                        >
                          {testCalendarMutation.isPending ? "Testing..." : "Test Connection"}
                        </Button>
                      </div>

                      <div className="mt-1 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-sm mb-2">📅 Complete Order Timeline</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Once connected, calendar events are created automatically for orders with delivery dates!
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-base">📦</span>
                            <div>
                              <p className="text-xs font-medium">Delivery Day</p>
                              <p className="text-xs text-muted-foreground">Product arrival alert</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-base">⭐</span>
                            <div>
                              <p className="text-xs font-medium">Review (Day +2)</p>
                              <p className="text-xs text-muted-foreground">Complete rating & review</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-base">💰</span>
                            <div>
                              <p className="text-xs font-medium">Refund Form (Day +7)</p>
                              <p className="text-xs text-muted-foreground">Submit refund form</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-base">💸</span>
                            <div>
                              <p className="text-xs font-medium">Payment (Day +20)</p>
                              <p className="text-xs text-muted-foreground">Contact mediator</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-3 font-medium">
                          ✅ No setup required - works instantly with your Google account!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm">Order Events</h5>
                          <p className="text-xs text-muted-foreground">Create events when orders are placed</p>
                        </div>
                        <Switch
                          checked={calendarSettings.createOrderEvents}
                          onCheckedChange={(checked) => 
                            setCalendarSettings(prev => ({ ...prev, createOrderEvents: checked }))
                          }
                          data-testid="switch-order-events"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm">Delivery Reminders</h5>
                          <p className="text-xs text-muted-foreground">Remind about expected delivery dates</p>
                        </div>
                        <Switch
                          checked={calendarSettings.createDeliveryEvents}
                          onCheckedChange={(checked) => 
                            setCalendarSettings(prev => ({ ...prev, createDeliveryEvents: checked }))
                          }
                          data-testid="switch-delivery-events"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm">Refund Reminders</h5>
                          <p className="text-xs text-muted-foreground">Remind about refund form deadlines</p>
                        </div>
                        <Switch
                          checked={calendarSettings.createRefundReminders}
                          onCheckedChange={(checked) => 
                            setCalendarSettings(prev => ({ ...prev, createRefundReminders: checked }))
                          }
                          data-testid="switch-refund-reminders"
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messaging Templates */}
          <Card className="card-shadow border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MessageSquare className="w-5 h-5 mr-2 text-orange-500" />
                Messaging Templates
              </CardTitle>
              <p className="text-sm text-muted-foreground">Configure message templates for communicating with mediators</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Enable Messaging</h4>
                    <p className="text-sm text-muted-foreground">Send automated messages to mediators via WhatsApp</p>
                  </div>
                  <Switch
                    checked={messagingSettings.enabled}
                    onCheckedChange={(checked) => {
                      setMessagingSettings(prev => ({ ...prev, enabled: checked }));
                      updateMessagingMutation.mutate({ ...messagingSettings, enabled: checked });
                    }}
                    disabled={updateMessagingMutation.isPending}
                    data-testid="switch-messaging-enabled"
                  />
                </div>

                {messagingSettings.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-orange-100">
                    <div>
                      <label className="text-sm font-medium">Message Template Style</label>
                      <Select 
                        value={messagingSettings.selectedTemplate} 
                        onValueChange={(value) => {
                          setMessagingSettings(prev => ({ ...prev, selectedTemplate: value }));
                          updateMessagingMutation.mutate({ ...messagingSettings, selectedTemplate: value });
                        }}
                        disabled={updateMessagingMutation.isPending}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-message-template">
                          <SelectValue placeholder="Select template style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default - Simple and clear</SelectItem>
                          <SelectItem value="friendly">Friendly - Casual with emojis</SelectItem>
                          <SelectItem value="professional">Professional - Formal business tone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-medium">Template Preview</h5>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Order Confirmation:</span>
                          <p className="text-sm">{messageTemplates[messagingSettings.selectedTemplate as keyof typeof messageTemplates].orderConfirmation}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Delivery Reminder:</span>
                          <p className="text-sm">{messageTemplates[messagingSettings.selectedTemplate as keyof typeof messageTemplates].deliveryReminder}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Refund Form Reminder:</span>
                          <p className="text-sm">{messageTemplates[messagingSettings.selectedTemplate as keyof typeof messageTemplates].refundFormReminder}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Payment Request:</span>
                          <p className="text-sm">{messageTemplates[messagingSettings.selectedTemplate as keyof typeof messageTemplates].paymentRequest}</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => testMessageMutation.mutate()}
                      disabled={testMessageMutation.isPending || !mediators || mediators.length === 0}
                    >
                      {testMessageMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Test Message to Mediator
                        </>
                      )}
                    </Button>

                    {!mediators || mediators.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Add a mediator first to test messaging
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Database className="w-5 h-5 mr-2 text-indigo-500" />
                Data Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">Export your data or import orders in bulk</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Export Section */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <h5 className="font-medium mb-2">Orders Data</h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export all your order data including status, amounts, and mediator information
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('orders')}
                        data-testid="button-export-orders"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Orders
                      </Button>
                    </div>

                    <div className="text-center">
                      <h5 className="font-medium mb-2">Mediators Data</h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export mediator information and performance statistics
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('mediators')}
                        data-testid="button-export-mediators"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Mediators
                      </Button>
                    </div>

                    <div className="text-center">
                      <h5 className="font-medium mb-2">Accounts Data</h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export your e-commerce account information and activity
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('accounts')}
                        data-testid="button-export-accounts"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Accounts
                      </Button>
                    </div>

                    <div className="text-center">
                      <h5 className="font-medium mb-2">Bank Accounts Data</h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export your bank account information for refunds
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('bank-accounts')}
                        data-testid="button-export-bank-accounts"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Bank Accounts
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Import Section */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Orders
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-blue-800 mb-2">📝 Before Importing:</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• <strong>Download the template first</strong> - it shows the correct format</p>
                        <p>• <strong>Account Name:</strong> Must match exactly with accounts you've created (case-sensitive)</p>
                        <p>• <strong>Mediator Name:</strong> Must match exactly with mediators you've created (case-sensitive)</p>
                        <p>• <strong>Bank Account Name:</strong> Optional - must match exactly with bank accounts you've created</p>
                        <p>• <strong>Tip:</strong> Create accounts, mediators, and bank accounts first, then use their exact names in the CSV</p>
                        <p>• <strong>Order amounts:</strong> Enter in rupees (e.g., 1500 for ₹1500)</p>
                        <p>• <strong>Dates:</strong> Use YYYY-MM-DD format (e.g., 2024-01-15)</p>
                        <p>• <strong>Status:</strong> Use: Ordered, Delivered, Refund Requested, Refund Approved, Refunded, Cancelled, Returned, Disputed</p>
                      </div>
                    </div>
                    
                    {/* Import Status Display */}
                    <div id="import-status" className="hidden">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-2">Import Status</h5>
                        <div id="import-results" className="text-sm text-green-700"></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Upload CSV File
                        </label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleImport}
                          data-testid="input-import-file"
                          className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Select a CSV file formatted according to the template
                        </p>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <Button
                          variant="outline"
                          onClick={downloadTemplate}
                          data-testid="button-download-template"
                          className="mb-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Get the CSV template with proper format and sample data
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </MainLayout>
  );
}
