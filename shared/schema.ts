import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for admin authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Circus shows table
export const circusShows = pgTable("circus_shows", {
  id: serial("id").primaryKey(),
  circusName: varchar("circus_name", { length: 100 }).notNull(),
  venueName: varchar("venue_name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  showDate: timestamp("show_date").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  fileName: varchar("file_name", { length: 255 }),
});

export const insertCircusShowSchema = createInsertSchema(circusShows).omit({
  id: true,
  uploadedAt: true,
});

export const fileUploadSchema = z.object({
  fileName: z.string(),
  uploadDate: z.date(),
  status: z.enum(["success", "error"]),
  recordCount: z.number(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CircusShow = typeof circusShows.$inferSelect;
export type InsertCircusShow = z.infer<typeof insertCircusShowSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;

// Additional types for frontend
export type CircusShowWithCoords = CircusShow & {
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
