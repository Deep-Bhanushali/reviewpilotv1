import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, TrendingUp, Shield, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold">ReviewSystem</h1>
            </div>
            
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              Professional Review
              <span className="text-primary block">Management Platform</span>
            </h2>
            
            <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-8">
              Streamline your review-based earnings with our comprehensive platform. 
              Track orders, manage mediators, and monitor refunds efficiently.
            </p>
            
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = "/api/auth/google"}
              data-testid="button-login"
            >
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Everything you need to manage your review business
            </h3>
            <p className="text-xl text-muted-foreground">
              Powerful tools designed for efficiency and growth
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="card-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">Order Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  Complete lifecycle management from placement to refund completion
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">Secure Management</h4>
                <p className="text-sm text-muted-foreground">
                  Safely manage mediator relationships and account information
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="font-semibold mb-2">Real-time Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Stay informed with automated notifications and payment reminders
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">Analytics Dashboard</h4>
                <p className="text-sm text-muted-foreground">
                  Comprehensive insights into earnings, performance, and trends
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Ready to optimize your review business?
          </h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join professionals who trust ReviewSystem for their earnings management
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => window.location.href = "/api/auth/google"}
            data-testid="button-cta-login"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
