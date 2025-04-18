import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const FileUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await apiRequest("POST", "/api/uploads", formData);
    },
    onSuccess: () => {
      // Invalidate and refetch queries that depend on the shows data
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/date-range"] });
      
      setSelectedFile(null);
      
      toast({
        title: "Upload Successful",
        description: "Your file has been processed and the circus shows have been added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Trigger file input click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    uploadMutation.mutate(formData);
  };
  
  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4 font-montserrat text-navy">Upload Show Data</h2>
      
      <div className="mb-6">
        <div
          className={`border-2 border-dashed ${isDragging ? 'border-primary' : 'border-gray-300'} rounded-lg p-8 text-center`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
            <p className="text-lg text-gray-600 mb-2">
              {selectedFile 
                ? `Selected file: ${selectedFile.name}` 
                : "Drag and drop your CSV/Excel file here"}
            </p>
            {!selectedFile && <p className="text-sm text-gray-500 mb-4">or</p>}
            
            {selectedFile ? (
              <div className="flex space-x-3">
                <Button 
                  className="bg-primary text-white hover:bg-primary-dark"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload File"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={handleBrowseClick}
              >
                Browse Files
              </Button>
            )}
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv,.xlsx,.xls" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium mb-3">File Requirements</h3>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>File format: CSV or Excel (.xlsx, .xls)</li>
          <li>Required columns: Circus Name, Venue Name, Address, City, State, ZIP, Coordinates, Show Date</li>
          <li>Coordinates should be in format: "latitude, longitude"</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
