import React from "react";
import FileUpload from "@/components/FileUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileUpload as FileUploadType } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const AdminView: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch upload history
  const { data: uploads, isLoading } = useQuery<FileUploadType[]>({
    queryKey: ["/api/uploads"],
  });
  
  // Delete upload mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      await apiRequest("DELETE", `/api/uploads/${encodeURIComponent(fileName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/date-range"] });
      
      toast({
        title: "Upload deleted",
        description: "The file and associated shows have been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting upload",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle file deletion
  const handleDelete = (fileName: string) => {
    if (confirm(`Are you sure you want to delete ${fileName} and all associated show data?`)) {
      deleteMutation.mutate(fileName);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FileUpload />
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-2xl font-semibold mb-4 font-montserrat text-navy">Recent Uploads</h2>
        
        {isLoading ? (
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
                {uploads.map((upload, index) => (
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
                      >
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-900 p-0"
                        onClick={() => handleDelete(upload.fileName)}
                        disabled={deleteMutation.isPending}
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
            No uploads found. Use the form above to upload circus show data.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;
