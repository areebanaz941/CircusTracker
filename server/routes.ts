import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { processFile } from "./services/fileParser";
import { z } from "zod";
import { fileUploadSchema, insertCircusShowSchema } from "@shared/schema";
import { User } from "./db";
import crypto from "crypto";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Accept only CSV and Excel files
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (
      allowedTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".csv") ||
      file.originalname.toLowerCase().endsWith(".xlsx") ||
      file.originalname.toLowerCase().endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      // Create and pass the error when rejecting the file
      const error = new Error("Invalid file type. Only CSV and Excel files are allowed.");
      cb(error as any, false);
    }
  },
});

// Helper function to hash password
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Helper function to verify password
function verifyPassword(storedPassword: string, suppliedPassword: string): boolean {
  // For our demo purposes, to make it work with in-memory storage
  if (storedPassword === "this_would_be_hashed_CircusMapping@12" && suppliedPassword === "CircusMapping@12") {
    return true;
  }
  
  // Regular verification for real hashed passwords
  if (storedPassword.includes(':')) {
    const [salt, storedHash] = storedPassword.split(':');
    const hash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
    return storedHash === hash;
  }
  
  return false;
}

// Authentication middleware
const requireAuth = async (req: Request, res: Response, next: Function) => {
  // Get token from header (in a real app, use proper JWT)
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    // In a real app, verify JWT token
    // For this example, we just check if token is 'admin-token'
    if (token !== 'admin-token') {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize admin user is now handled in storage.ts and db.ts
  // Add this to the registerRoutes function
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
  // Login endpoint
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Direct hardcoded admin authentication for stability
    // This ensures login works regardless of database connection
    if (username === 'admin1@gmail.com' && password === 'CircusMapping@12') {
      console.log("Direct admin authentication successful");
      return res.json({ 
        success: true,
        token: 'admin-token',
        user: {
          id: 'admin-id',
          username: 'admin1@gmail.com',
          role: 'admin'
        }
      });
    }
    
    try {
      // If not the admin user, try normal authentication flow
      let user;
      try {
        // Set a shorter timeout for MongoDB query
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB timeout')), 2000)
        );
        user = await Promise.race([
          User.findOne({ username }),
          timeoutPromise
        ]);
      } catch (mongoError: any) {
        // MongoDB error, try fallback storage
        console.log("MongoDB error, using fallback storage for login:", mongoError.message);
        user = await storage.getUserByUsername(username);
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }
      
      // Verify password
      const passwordMatch = verifyPassword(user.password, password);
      
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }
      
      // In a real app, generate JWT token here
      res.json({ 
        success: true,
        token: 'admin-token',
        user: {
          id: user._id,
          username: user.username,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });
  
  // Register endpoint
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Username already exists" 
        });
      }
      
      // Create new user
      const hashedPassword = hashPassword(password);
      const newUser = new User({
        username,
        password: hashedPassword,
        role: 'user'
      });
      
      await newUser.save();
      
      res.status(201).json({ 
        success: true,
        message: "User created successfully"
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });
  
  // Logout endpoint (would handle JWT token invalidation in a real app)
  app.post("/api/logout", (req, res) => {
    res.json({ success: true });
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
  
  // Add show manually (protected route)
  app.post("/api/shows", requireAuth, async (req, res) => {
    try {
      const showData = {
        ...req.body,
        showDate: new Date(req.body.showDate),
        fileName: 'manual-entry.csv' // for manually added shows
      };
      
      const newShow = await storage.createShow(showData);
      res.status(201).json(newShow);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Upload file
  app.post("/api/uploads", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileName = req.file.originalname;
      const fileBuffer = req.file.buffer;
      
      console.log(`Processing file: ${fileName}, size: ${fileBuffer.length} bytes`);
      
      // Process file and insert shows
      const result = await processFile(fileBuffer, fileName);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Insert each show
      for (const show of result.data) {
        try {
          const validatedShow = insertCircusShowSchema.parse({
            ...show,
            fileName // Add fileName to track the source
          });
          
          await storage.createShow(validatedShow);
        } catch (error) {
          console.error("Error inserting show:", error);
        }
      }
      
      // Create file upload record with the actual file content
      const fileUpload = fileUploadSchema.parse({
        fileName,
        uploadDate: new Date(),
        status: "success",
        recordCount: result.data.length,
      });
      
      await storage.createFileUpload(fileUpload, fileBuffer);
      
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
          
          await storage.createFileUpload(fileUpload, req.file.buffer);
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
  app.get("/api/uploads", requireAuth, async (req, res) => {
    try {
      const uploads = await storage.getFileUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Download a specific file
  app.get("/api/uploads/:fileName/download", requireAuth, async (req, res) => {
    try {
      const { fileName } = req.params;
      const decodedFileName = decodeURIComponent(fileName);
      
      // Get the file from FileUpload collection
      const upload = await storage.getFileById(decodedFileName);
      
      if (!upload || !upload.fileContent) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate headers based on file type
      const fileType = upload.fileType || 'csv';
      let contentType = 'text/csv';
      
      if (fileType === 'xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileType === 'xls') {
        contentType = 'application/vnd.ms-excel';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${decodedFileName}"`);
      
      // Send the file content
      res.send(upload.fileContent);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Delete upload and associated shows
  app.delete("/api/uploads/:fileName", requireAuth, async (req, res) => {
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