import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { processFile } from "./services/fileParser";
import { z } from "zod";
import { fileUploadSchema, insertCircusShowSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only CSV and Excel files
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (
      allowedTypes.includes(file.mimetype) ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."), false);
    }
  },
});

// Simple admin auth middleware
const adminAuth = (req: Request, res: Response, next: Function) => {
  const adminPassword = req.headers["x-admin-password"];
  
  if (adminPassword === "admin123") {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoint (simplified for demo)
  app.post("/api/auth/admin", (req, res) => {
    const { password } = req.body;
    
    if (password === "admin123") {
      res.json({ success: true });
    } else {
      res.status(401).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }
  });
  
  // Get all circus shows
  app.get("/api/shows", async (req, res) => {
    try {
      const shows = await storage.getAllShows();
      res.json(shows);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get circus shows by date
  app.get("/api/shows/date/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const shows = await storage.getShowsByDate(date);
      res.json(shows);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get date range (earliest to latest show dates)
  app.get("/api/shows/date-range", async (req, res) => {
    try {
      const dateRange = await storage.getShowDateRange();
      res.json(dateRange);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get venues (grouped by location)
  app.get("/api/shows/venues", async (req, res) => {
    try {
      const venues = await storage.getVenues();
      res.json(venues);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Upload file
  app.post("/api/uploads", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileName = req.file.originalname;
      const fileBuffer = req.file.buffer;
      
      // Process file and insert shows
      const result = await processFile(fileBuffer, fileName);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Insert each show
      for (const show of result.data) {
        try {
          const validatedShow = insertCircusShowSchema.parse(show);
          await storage.createShow({
            ...validatedShow,
            fileName,
          });
        } catch (error) {
          console.error("Error inserting show:", error);
        }
      }
      
      // Create file upload record
      const fileUpload = fileUploadSchema.parse({
        fileName,
        uploadDate: new Date(),
        status: "success",
        recordCount: result.data.length,
      });
      
      await storage.createFileUpload(fileUpload);
      
      res.json({ 
        success: true, 
        message: `Successfully processed ${result.data.length} records`,
        recordCount: result.data.length
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("File upload error:", errorMessage);
      
      // Create file upload record with error status
      try {
        if (req.file) {
          const fileUpload = fileUploadSchema.parse({
            fileName: req.file.originalname,
            uploadDate: new Date(),
            status: "error",
            recordCount: 0,
          });
          
          await storage.createFileUpload(fileUpload);
        }
      } catch (e) {
        console.error("Error creating file upload record:", e);
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage
      });
    }
  });
  
  // Get upload history
  app.get("/api/uploads", async (req, res) => {
    try {
      const uploads = await storage.getFileUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Delete upload and associated shows
  app.delete("/api/uploads/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      await storage.deleteFileAndShows(decodeURIComponent(fileName));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
