import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Catalog from "@/pages/catalog";
import UsersPage from "@/pages/users";
import SchoolsPage from "@/pages/schools";
import SettingsPage from "@/pages/settings";
import MyLoansPage from "@/pages/my-loans";
import { useEffect, type FC } from "react";

interface ProtectedRouteProps {
  component: FC;
  requireSuperAdmin?: boolean;
}

function ProtectedRoute({ component: Component, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
    if (!loading && user && requireSuperAdmin && user.role !== "super_admin") {
      setLocation("/dashboard");
    }
  }, [loading, user, setLocation, requireSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireSuperAdmin && user.role !== "super_admin") {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/catalog">
        {() => <ProtectedRoute component={Catalog} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UsersPage} />}
      </Route>
      <Route path="/schools">
        {() => <ProtectedRoute component={SchoolsPage} requireSuperAdmin />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/my-loans">
        {() => <ProtectedRoute component={MyLoansPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
