import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Clock,
  Star,
  Shield,
  LogOut,
  User,
  Menu,
  Upload,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { username, isAdmin, logout, logoutAdmin } = useGuestAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/entry", { replace: true });
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
  };

  const navItems = [
    { icon: FolderOpen, label: "All Files", path: "/" },
    { icon: Clock, label: "Recent", path: "/recent" },
    { icon: Star, label: "Favorites", path: "/favorites" },
  ];

  if (isAdmin) {
    navItems.push({ icon: Shield, label: "Admin Panel", path: "/admin" });
  }

  const NavContent = () => (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || 
          (item.path === "/" && location.pathname.startsWith("/?"));
        return (
          <Link 
            key={item.path} 
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="flex items-center gap-2 mb-6">
                  <FolderOpen className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">CODE RESOL</span>
                </div>
                <NavContent />
              </SheetContent>
            </Sheet>
            
            <FolderOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold hidden sm:inline">CODE RESOL</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Badge variant="destructive" className="hidden sm:flex">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            
            {/* Quick upload button for mobile */}
            <Link to="/" className="md:hidden">
              <Button variant="ghost" size="icon">
                <Upload className="h-5 w-5" />
                <span className="sr-only">Upload</span>
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium truncate max-w-[200px]">{username}</p>
                    {isAdmin && (
                      <p className="text-xs text-destructive font-semibold">Administrator</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={handleLogoutAdmin}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Exit Admin Mode</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r p-4 hidden md:block">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
