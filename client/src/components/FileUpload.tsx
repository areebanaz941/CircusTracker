import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileType2, FileX, CheckCircle2, RotateCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + Math.random() * 15;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);
      
      try {
        const response = await apiRequest("POST", "/api/uploads", formData);
        
        // Clear interval before proceeding
        clearInterval(progressInterval);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Upload failed");
        }
        
        setUploadProgress(100);
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data) => {
      setSelectedFile(null);
      
      toast({
        title: "Upload Successful",
        description: `${data.recordCount} records have been processed.`,
      });
      
      // Invalidate cached data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shows/date-range"] });
      
      // Reset progress after animation completes
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setUploadProgress(0);
      
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setErrorMessage("");
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload");
      return;
    }
    
    // Check file type
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      setErrorMessage("Please select a CSV or Excel file");
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    // Execute upload
    uploadMutation.mutate(formData);
  };

  // Reset file selection
  const handleCancelSelection = () => {
    setSelectedFile(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isUploading
              ? "bg-gray-50 border-gray-300" 
              : errorMessage 
                ? "bg-red-50 border-red-300" 
                : "bg-blue-50 border-blue-300 hover:bg-blue-100 cursor-pointer"
          } transition-colors`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          
          {/* Upload in progress */}
          {isUploading ? (
            <div className="space-y-4">
              <RotateCw className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-gray-600">
                Uploading {selectedFile?.name}...
              </p>
              <Progress value={uploadProgress} className="w-full h-2 mt-4" />
              <p className="text-sm text-gray-500">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          ) : selectedFile ? (
            /* File selected */
            <div className="space-y-3">
              <FileType2 className="h-12 w-12 mx-auto text-primary" />
              <p className="text-gray-700 font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              <Button 
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelSelection();
                }}
              >
                <FileX className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            /* No file selected */
            <div className="space-y-3">
              <Upload className="h-12 w-12 mx-auto text-primary" />
              <p className="text-gray-700 font-medium">
                Drag and drop your file or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports CSV and Excel files (xlsx, xls)
              </p>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {errorMessage && (
          <div className="text-center text-red-500 text-sm">{errorMessage}</div>
        )}
        
        {/* Upload button */}
        {selectedFile && !isUploading && (
          <Button 
            type="submit" 
            className="w-full bg-primary text-white"
            disabled={isUploading || !selectedFile}
          >
            {uploadProgress === 100 ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Upload Complete
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        )}
      </form>
    </div>
  );
};

export default FileUpload;