import { 
  users, 
  circusShows,
  type User, 
  type InsertUser, 
  type CircusShow, 
  type InsertCircusShow,
  type FileUpload,
  type CircusShowWithCoords,
  type CircusVenue
} from "@shared/schema";

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Show methods
  getAllShows(): Promise<CircusShowWithCoords[]>;
  getShowsByDate(date: string): Promise<CircusShowWithCoords[]>;
  createShow(show: InsertCircusShow & { fileName: string }): Promise<CircusShow>;
  getShowDateRange(): Promise<{ startDate: string; endDate: string }>;
  getVenues(): Promise<CircusVenue[]>;
  
  // File upload methods
  getFileUploads(): Promise<FileUpload[]>;
  createFileUpload(upload: FileUpload): Promise<FileUpload>;
  deleteFileAndShows(fileName: string): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shows: Map<number, CircusShow>;
  private fileUploads: FileUpload[];
  private currentUserId: number;
  private currentShowId: number;

  constructor() {
    this.users = new Map();
    this.shows = new Map();
    this.fileUploads = [];
    this.currentUserId = 1;
    this.currentShowId = 1;
    
    // Add default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Show methods
  async getAllShows(): Promise<CircusShowWithCoords[]> {
    return Array.from(this.shows.values()).map(show => ({
      ...show,
      coords: [parseFloat(show.latitude), parseFloat(show.longitude)]
    }));
  }
  
  async getShowsByDate(dateStr: string): Promise<CircusShowWithCoords[]> {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.shows.values())
      .filter(show => {
        const showDate = new Date(show.showDate);
        showDate.setHours(0, 0, 0, 0);
        return showDate.getTime() === targetDate.getTime();
      })
      .map(show => ({
        ...show,
        coords: [parseFloat(show.latitude), parseFloat(show.longitude)]
      }));
  }
  
  async createShow(show: InsertCircusShow & { fileName: string }): Promise<CircusShow> {
    const id = this.currentShowId++;
    const newShow: CircusShow = {
      id,
      ...show,
      uploadedAt: new Date(),
    };
    
    this.shows.set(id, newShow);
    return newShow;
  }
  
  async getShowDateRange(): Promise<{ startDate: string; endDate: string }> {
    const shows = Array.from(this.shows.values());
    
    if (shows.length === 0) {
      // Default date range if no shows
      return {
        startDate: new Date("2025-04-01").toISOString(),
        endDate: new Date("2025-10-31").toISOString(),
      };
    }
    
    const dates = shows.map(show => new Date(show.showDate));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }
  
  async getVenues(): Promise<CircusVenue[]> {
    const shows = Array.from(this.shows.values());
    
    // Group shows by venue
    const venueMap = new Map<string, {
      shows: CircusShow[];
      venueName: string;
      city: string;
      state: string;
      address: string;
      coords: [number, number];
    }>();
    
    shows.forEach(show => {
      const key = `${show.venueName}-${show.city}-${show.state}`;
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          shows: [],
          venueName: show.venueName,
          city: show.city,
          state: show.state,
          address: show.address,
          coords: [parseFloat(show.latitude), parseFloat(show.longitude)],
        });
      }
      
      venueMap.get(key)!.shows.push(show);
    });
    
    // Convert to venues array with date ranges
    return Array.from(venueMap.values()).map((venue, index) => {
      const dates = venue.shows.map(show => new Date(show.showDate));
      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      return {
        id: index + 1,
        venueName: venue.venueName,
        city: venue.city,
        state: venue.state,
        address: venue.address,
        startDate,
        endDate,
        coords: venue.coords,
      };
    });
  }
  
  // File upload methods
  async getFileUploads(): Promise<FileUpload[]> {
    return [...this.fileUploads];
  }
  
  async createFileUpload(upload: FileUpload): Promise<FileUpload> {
    this.fileUploads.push(upload);
    return upload;
  }
  
  async deleteFileAndShows(fileName: string): Promise<void> {
    // Remove file from uploads
    this.fileUploads = this.fileUploads.filter(upload => upload.fileName !== fileName);
    
    // Remove associated shows
    const showIds: number[] = [];
    this.shows.forEach((show, id) => {
      if (show.fileName === fileName) {
        showIds.push(id);
      }
    });
    
    showIds.forEach(id => {
      this.shows.delete(id);
    });
  }
}

export const storage = new MemStorage();
