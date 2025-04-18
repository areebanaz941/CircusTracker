import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { formatDate } from "@/lib/dateUtils";
import { Download } from "lucide-react";

// Manual circus show entry schema
const circusShowSchema = z.object({
  circusName: z.string().min(2, { message: "Circus name is required" }),
  venueName: z.string().min(2, { message: "Venue name is required" }),
  address: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zip: z.string().min(5, { message: "ZIP code is required" }),
  latitude: z.string().regex(/^-?\d+(\.\d+)?$/, { message: "Invalid latitude format" }),
  longitude: z.string().regex(/^-?\d+(\.\d+)?$/, { message: "Invalid longitude format" }),
  showDate: z.string().min(1, { message: "Show date is required" }),
});

type CircusShowFormValues = z.infer<typeof circusShowSchema>;

const AdminDashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // Get file uploads
  const { data: uploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ["/api/uploads"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      
      const response = await fetch("/api/uploads", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch uploads");
      }
      
      return response.json();
    },
    enabled: isAuthenticated
  });

  // Setup manual entry form
  const form = useForm<CircusShowFormValues>({
    resolver: zodResolver(circusShowSchema),
    defaultValues: {
      circusName: "",
      venueName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      latitude: "",
      longitude: "",
      showDate: new Date().toISOString().split('T')[0],
    },
  });

  // Create show mutation
  const createShowMutation = useMutation({
    mutationFn: async (data: CircusShowFormValues) => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      
      const values = {
        ...data,
        showDate: new Date(data.showDate)
      };
      
      const response = await fetch("/api/shows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create show");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Show has been added successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/date-range"] });
      
      // Reset form
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout handler
  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      
      // Call logout API
      await apiRequest("POST", "/api/logout");
      
      // Navigate to home
      navigate("/");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  // Form submission
  const onSubmit = (data: CircusShowFormValues) => {
    createShowMutation.mutate(data);
  };

  // Delete file and associated shows
  const deleteFileMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      
      const response = await fetch(`/api/uploads/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete file");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/date-range"] });
      
      toast({
        title: "Deleted",
        description: "File and associated shows have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle file deletion
  const handleDelete = (fileName: string) => {
    if (confirm(`Are you sure you want to delete ${fileName} and all associated show data?`)) {
      deleteFileMutation.mutate(fileName);
    }
  };

  // Handle file download
  const handleDownload = async (fileName: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      
      const response = await fetch(`/api/uploads/${encodeURIComponent(fileName)}/download`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download file");
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return null; // Don't render until authentication is confirmed
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 mr-2 rounded-md bg-primary flex items-center justify-center text-white">
              <span className="font-bold">SC</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              View Map
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="history">Upload History</TabsTrigger>
          </TabsList>
          
          {/* File Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Circus Data</CardTitle>
                <CardDescription>
                  Upload CSV or Excel files with circus show data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Add Circus Show</CardTitle>
                <CardDescription>
                  Manually add a circus show to the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="circusName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Circus Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Big Top Circus" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="venueName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Central Park" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input placeholder="40.7831" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input placeholder="-73.9712" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="showDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Show Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="mt-4 bg-primary hover:bg-primary-dark text-white"
                      disabled={createShowMutation.isPending}
                    >
                      {createShowMutation.isPending ? "Saving..." : "Add Show"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Upload History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>
                  Review previous file uploads and manage data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadsLoading ? (
                  <div className="py-8 text-center text-gray-500">Loading uploads...</div>
                ) : uploads && uploads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploads.map((upload: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <i className="fas fa-file-excel text-green-500 mr-2"></i>
                                <span className="text-sm font-medium text-gray-900">{upload.fileName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(new Date(upload.uploadDate), { includeYear: true })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                upload.status === 'success' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {upload.status === 'success' ? 'Success' : 'Error'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{upload.recordCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button 
                                variant="ghost" 
                                className="text-primary hover:text-primary-dark mr-3 p-0"
                                onClick={() => handleDownload(upload.fileName)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-900 p-0"
                                onClick={() => handleDelete(upload.fileName)}
                                disabled={deleteFileMutation.isPending}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No upload history found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; 2025 Europa SC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;