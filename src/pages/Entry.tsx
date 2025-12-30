import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Entry = () => {
  const navigate = useNavigate();
  const { username, setUsername, loading } = useGuestAuth();
  const { toast } = useToast();
  const [inputUsername, setInputUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && username) {
      navigate("/");
    }
  }, [username, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (inputUsername.trim().length < 2) {
      toast({
        title: "Error",
        description: "Username must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to insert or get existing user
      const { error } = await supabase
        .from("guest_users")
        .upsert(
          { username: inputUsername.trim() },
          { onConflict: "username", ignoreDuplicates: true }
        );

      if (error && error.code !== "23505") {
        throw error;
      }

      setUsername(inputUsername.trim());
      toast({
        title: "Welcome!",
        description: `Logged in as ${inputUsername.trim()}`,
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="p-3 bg-primary/10 rounded-full">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">CODE RESOL</CardTitle>
          <CardDescription>
            Enter your username to access the file manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  className="pl-10"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entering..." : "Enter"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Link to="/admin-login">
              <Button variant="ghost" className="w-full text-muted-foreground">
                <Shield className="mr-2 h-4 w-4" />
                Admin Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Entry;
