import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function CalendarConnectButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has calendar tokens
  const { data: userSettings } = useQuery({
    queryKey: ["/api/user-settings"],
    enabled: true,
  });

  // Determine connection status
  const isConnected = (userSettings as any)?.googleAccessToken &&
                     (userSettings as any)?.calendarEnabled === 1;

  // Mutation to get auth URL and redirect
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/calendar/auth');
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    },
    onError: (error) => {
      console.error('Calendar auth error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={connectMutation.isPending}
      variant={isConnected ? "secondary" : "outline"}
      className="w-full"
      data-testid="button-connect-calendar"
    >
      {connectMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : isConnected ? (
        <>
          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
          Google Calendar Connected
        </>
      ) : (
        <>
          <LinkIcon className="w-4 h-4 mr-2" />
          Connect Google Calendar
        </>
      )}
    </Button>
  );
}
