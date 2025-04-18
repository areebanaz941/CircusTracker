import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Login form validation schema
const loginSchema = z.object({
  username: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const AuthPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      navigate("/admin");
    }
  }, [navigate]);

  // Initialize login form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // Set authentication state in localStorage
      localStorage.setItem("isAuthenticated", "true");
      
      // Display success message
      toast({
        title: "Login successful",
        description: "Welcome to the admin dashboard",
        variant: "default",
      });
      
      // Trigger a custom event to update App.tsx state
      window.dispatchEvent(new CustomEvent("auth:success"));
      
      // Redirect to admin dashboard
      setTimeout(() => {
        navigate("/admin");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  // Form submission handler
  const onSubmit = (values: LoginFormValues) => {
    setIsLoading(true);
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1">
        {/* Login Form */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Login</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access the admin dashboard
              </p>
            </div>

            <div className="mt-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="hidden lg:block relative w-0 flex-1 bg-navy">
          <div className="absolute inset-0 flex flex-col justify-center items-center px-10 text-white">
            <div className="h-24 w-24 mb-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-4xl font-bold">SC</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-center">Europa Circus Tracker</h1>
            <p className="text-xl max-w-lg text-center text-gray-300">
              Administrative portal for managing circus shows, venues, and interactive map data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;