import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for simple admin authentication
 */
export const useAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  
  // Admin login
  const login = (password: string): boolean => {
    if (password === "admin123") {
      setIsAdmin(true);
      return true;
    } else {
      toast({
        title: "Authentication Failed",
        description: "Invalid password. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Admin logout
  const logout = () => {
    setIsAdmin(false);
  };
  
  return {
    isAdmin,
    login,
    logout
  };
};
