import { z } from "zod";

// MongoDB Schema Types (for use with TypeScript)

// User schema
export const userSchema = z.object({
  _id: z.any().optional(), // MongoDB ObjectId
  username: z.string(),
  password: z.string(),
  role: z.string().optional(), // Added role field
  createdAt: z.date().optional() // Added creation date
});

// Circus show schema
export const circusShowSchema = z.object({
  _id: z.any().optional(), // MongoDB ObjectId
  circusName: z.string(),
  venueName: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  showDate: z.date(),
  uploadedAt: z.date().optional(),
  fileName: z.string()
});

// File upload schema
export const fileUploadSchema = z.object({
  _id: z.any().optional(), // MongoDB ObjectId
  fileName: z.string(),
  uploadDate: z.date(),
  status: z.enum(["success", "error"]),
  recordCount: z.number(),
  fileContent: z.instanceof(Buffer).optional(), // Add file content field
  fileType: z.string().optional() // Add file type field (csv, xlsx, xls)
});

// Define types
export type User = z.infer<typeof userSchema>;
export type CircusShow = z.infer<typeof circusShowSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;

// Schema variants for insert operations
export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true });
export const insertCircusShowSchema = circusShowSchema.omit({ _id: true, uploadedAt: true });
export const insertFileUploadSchema = fileUploadSchema.omit({ _id: true, fileContent: true, fileType: true });

// Define insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCircusShow = z.infer<typeof insertCircusShowSchema>;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;

// Additional types for frontend
export type CircusShowWithCoords = Omit<CircusShow, "_id"> & {
  id: string;
  coords: [number, number];
};

export type CircusVenue = {
  id: number;
  venueName: string;
  city: string;
  state: string;
  address: string;
  startDate: Date;
  endDate: Date;
  coords: [number, number];
};

// Extended file upload schema for API operations that include file content
export const extendedFileUploadSchema = fileUploadSchema.extend({
  fileContent: z.instanceof(Buffer).optional(),
  fileType: z.string().optional()
});

export type ExtendedFileUpload = z.infer<typeof extendedFileUploadSchema>;