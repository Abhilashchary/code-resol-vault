import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { isAdmin, loginAsAdmin, loading } = useGuestAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter the admin password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Small delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = loginAsAdmin(password);

    if (success) {
      toast({
        title: "Welcome Admin!",
        description: "You now have full access to the platform",
      });
      navigate("/admin");
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid admin password",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
    setPassword("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Shield className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Enter the admin password to access administrative features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Login as Admin"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Link to="/entry">
              <Button variant="ghost" className="w-full text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to User Entry
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
