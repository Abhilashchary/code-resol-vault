import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { ClipboardProvider } from "@/hooks/useClipboard";
import Entry from "./pages/Entry";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Recent from "./pages/Recent";
import Favorites from "./pages/Favorites";
import Tags from "./pages/Tags";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SharePage from "./pages/SharePage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { username, loading } = useGuestAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!username) {
    return <Navigate to="/entry" replace />;
  }
  
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { username, isAdmin, loading } = useGuestAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!username) {
    return <Navigate to="/entry" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/entry" element={<Entry />} />
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route path="/share/:token" element={<SharePage />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/recent" element={<ProtectedRoute><Recent /></ProtectedRoute>} />
    <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
    <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
    <Route path="/auth" element={<Navigate to="/entry" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ClipboardProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ClipboardProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
