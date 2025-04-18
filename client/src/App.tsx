import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import { queryClient } from "@/lib/queryClient";

// Protected route component
const ProtectedRoute = ({ 
  component: Component,
  isAuthenticated
}: { 
  component: React.ComponentType; 
  isAuthenticated: boolean;
}) => {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated ? <Component /> : null;
};

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"user" | "admin">("user");
  const [, navigate] = useLocation();

  // Check if user is already authenticated
  useEffect(() => {
    // Check local storage for auth state (in a real app, use proper auth tokens)
    const authState = localStorage.getItem("isAuthenticated");
    if (authState === "true") {
      setIsAdmin(true);
    }
  }, []);

  // Close sidebar on mobile when changing view
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [currentView]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const switchToUserView = () => {
    setCurrentView("user");
    navigate("/");
  };

  const switchToAdminView = () => {
    if (isAdmin) {
      setCurrentView("admin");
      navigate("/admin");
    } else {
      navigate("/auth");
    }
  };

  // Simulate successful login (this will be replaced by actual API authentication)
  const handleLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  // Simulate logout
  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("isAuthenticated");
    setCurrentView("user");
    navigate("/");
  };

  // Set up authentication event listeners
  useEffect(() => {
    // Listen for authentication events from API responses
    const handleAuthSuccess = () => handleLoginSuccess();
    const handleAuthFailure = () => handleLogout();
    
    window.addEventListener("auth:success", handleAuthSuccess);
    window.addEventListener("auth:failure", handleAuthFailure);
    
    return () => {
      window.removeEventListener("auth:success", handleAuthSuccess);
      window.removeEventListener("auth:failure", handleAuthFailure);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen overflow-hidden">
        <Switch>
          <Route path="/auth">
            <AuthPage />
          </Route>
          
          <Route path="/admin">
            <ProtectedRoute 
              component={AdminDashboard} 
              isAuthenticated={isAdmin} 
            />
          </Route>
          
          <Route path="/">
            <>
              <Header 
                isAdmin={isAdmin}
                toggleSidebar={toggleSidebar}
                currentView="user"
                switchToUserView={switchToUserView}
                switchToAdminView={switchToAdminView}
              />
              
              <Sidebar 
                isOpen={sidebarOpen}
                isAdmin={isAdmin}
                currentView="user"
              />
              
              <main className={`pt-16 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-64" : ""}`}>
                <Home />
              </main>
            </>
          </Route>
          
          <Route>
            <NotFound />
          </Route>
        </Switch>
        
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
