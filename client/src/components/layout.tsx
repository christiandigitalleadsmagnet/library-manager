import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Book, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  Library,
  Building2,
  ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/api";

interface SidebarProps {
  collapsed?: boolean;
  user?: User | null;
}

export function Sidebar({ collapsed, user }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const isSuperAdmin = user?.role === "super_admin";
  
  const navItems = [
    ...(isSuperAdmin ? [{ icon: Building2, label: "Libraries", href: "/schools" }] : []),
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Book, label: "Catalog", href: "/catalog" },
    ...(!isSuperAdmin ? [{ icon: ShoppingCart, label: user?.role === "admin" ? "Member Loans" : "My Loans", href: "/my-loans" }] : []),
    ...(user?.role === "admin" || isSuperAdmin ? [{ icon: Users, label: "Members", href: "/users" }] : []),
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/10 p-2 rounded-lg">
            <Library className="h-6 w-6 text-sidebar-primary" />
          </div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-sidebar-foreground">
            Athenaeum
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              data-testid={`link-${item.label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
              )} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button 
          data-testid="button-logout"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block w-64 fixed inset-y-0 z-50">
        <Sidebar user={user} />
      </div>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 md:hidden"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-sidebar-border">
          <Sidebar user={user} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="w-10 md:hidden" />
            <h2 className="font-serif text-lg text-muted-foreground hidden md:block">
              Academic Library System
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium" data-testid="text-username">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
