import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import AdminView from "@/pages/AdminView";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AuthModal from "@/components/AuthModal";

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<"user" | "admin">("user");

  // Close sidebar on mobile when changing view
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [currentView]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogin = (password: string) => {
    // Simple client-side authentication for demo
    if (password === "admin123") {
      setIsAdmin(true);
      setCurrentView("admin");
      setShowAuthModal(false);
      return true;
    }
    return false;
  };

  const showAdminLogin = () => {
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const switchToUserView = () => {
    setCurrentView("user");
  };

  const switchToAdminView = () => {
    if (isAdmin) {
      setCurrentView("admin");
    } else {
      showAdminLogin();
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <Header 
        isAdmin={isAdmin}
        toggleSidebar={toggleSidebar}
        currentView={currentView}
        switchToUserView={switchToUserView}
        switchToAdminView={switchToAdminView}
      />
      
      <Sidebar 
        isOpen={sidebarOpen}
        isAdmin={isAdmin}
        currentView={currentView}
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        onLogin={handleLogin}
      />
      
      <main className={`pt-16 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-64" : ""}`}>
        <Switch>
          <Route path="/" component={() => (
            currentView === "user" ? <Home /> : <AdminView />
          )}/>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default App;
