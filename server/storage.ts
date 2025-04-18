import { CircusShowWithCoords, CircusVenue } from '@shared/schema';
import { User, CircusShow, FileUpload, connectDB } from './db';

// Connect to MongoDB
connectDB();

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Show methods
  getAllShows(): Promise<CircusShowWithCoords[]>;
  getShowsByDate(date: string): Promise<CircusShowWithCoords[]>;
  createShow(show: any & { fileName: string }): Promise<any>;
  getShowDateRange(): Promise<{ startDate: string; endDate: string }>;
  getVenues(): Promise<CircusVenue[]>;
  
  // File upload methods
  getFileUploads(): Promise<any[]>;
  createFileUpload(upload: any): Promise<any>;
  deleteFileAndShows(fileName: string): Promise<void>;
}

// MongoDB storage implementation
export class MongoDBStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<any | undefined> {
    try {
      const user = await User.findById(id);
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    try {
      const user = await User.findOne({ username });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: any): Promise<any> {
    try {
      const newUser = new User(user);
      const savedUser = await newUser.save();
      return savedUser.toObject();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Show methods
  async getAllShows(): Promise<CircusShowWithCoords[]> {
    try {
      const shows = await CircusShow.find().sort({ showDate: 1 });
      
      return shows.map(show => {
        const showObj = show.toObject();
        return {
          ...showObj,
          id: showObj._id.toString(),
          coords: [parseFloat(showObj.latitude), parseFloat(showObj.longitude)]
        };
      });
    } catch (error) {
      console.error('Error getting all shows:', error);
      return [];
    }
  }
  
  async getShowsByDate(dateStr: string): Promise<CircusShowWithCoords[]> {
    try {
      const targetDate = new Date(dateStr);
      // Set time to beginning of day
      targetDate.setHours(0, 0, 0, 0);
      
      // Set end of day
      const endDate = new Date(dateStr);
      endDate.setHours(23, 59, 59, 999);
      
      const shows = await CircusShow.find({
        showDate: {
          $gte: targetDate,
          $lte: endDate
        }
      }).sort({ showDate: 1 });
      
      return shows.map(show => {
        const showObj = show.toObject();
        return {
          ...showObj,
          id: showObj._id.toString(),
          coords: [parseFloat(showObj.latitude), parseFloat(showObj.longitude)]
        };
      });
    } catch (error) {
      console.error('Error getting shows by date:', error);
      return [];
    }
  }
  
  async createShow(show: any): Promise<any> {
    try {
      const newShow = new CircusShow({
        ...show,
        uploadedAt: new Date()
      });
      
      const savedShow = await newShow.save();
      return savedShow.toObject();
    } catch (error) {
      console.error('Error creating show:', error);
      throw error;
    }
  }
  
  async getShowDateRange(): Promise<{ startDate: string; endDate: string }> {
    try {
      const showCount = await CircusShow.countDocuments();
      
      if (showCount === 0) {
        // Default date range if no shows
        return {
          startDate: new Date("2025-04-01").toISOString(),
          endDate: new Date("2025-10-31").toISOString(),
        };
      }
      
      const earliestShow = await CircusShow.findOne().sort({ showDate: 1 });
      const latestShow = await CircusShow.findOne().sort({ showDate: -1 });
      
      return {
        startDate: earliestShow.showDate.toISOString(),
        endDate: latestShow.showDate.toISOString(),
      };
    } catch (error) {
      console.error('Error getting show date range:', error);
      return {
        startDate: new Date("2025-04-01").toISOString(),
        endDate: new Date("2025-10-31").toISOString(),
      };
    }
  }
  
  async getVenues(): Promise<CircusVenue[]> {
    try {
      const shows = await CircusShow.find();
      
      // Group shows by venue
      const venueMap = new Map<string, {
        shows: any[];
        venueName: string;
        city: string;
        state: string;
        address: string;
        coords: [number, number];
      }>();
      
      shows.forEach(show => {
        const showObj = show.toObject();
        const key = `${showObj.venueName}-${showObj.city}-${showObj.state}`;
        
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            shows: [],
            venueName: showObj.venueName,
            city: showObj.city,
            state: showObj.state,
            address: showObj.address,
            coords: [parseFloat(showObj.latitude), parseFloat(showObj.longitude)],
          });
        }
        
        venueMap.get(key)!.shows.push(showObj);
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
    } catch (error) {
      console.error('Error getting venues:', error);
      return [];
    }
  }
  
  // File upload methods
  async getFileUploads(): Promise<any[]> {
    try {
      const uploads = await FileUpload.find().sort({ uploadDate: -1 });
      return uploads.map(upload => upload.toObject());
    } catch (error) {
      console.error('Error getting file uploads:', error);
      return [];
    }
  }
  
  async createFileUpload(upload: any): Promise<any> {
    try {
      const newUpload = new FileUpload(upload);
      const savedUpload = await newUpload.save();
      return savedUpload.toObject();
    } catch (error) {
      console.error('Error creating file upload:', error);
      throw error;
    }
  }
  
  async deleteFileAndShows(fileName: string): Promise<void> {
    try {
      // Delete shows associated with the file
      await CircusShow.deleteMany({ fileName });
      
      // Delete the file upload record
      await FileUpload.deleteMany({ fileName });
    } catch (error) {
      console.error('Error deleting file and shows:', error);
      throw error;
    }
  }
}

// Initialize default admin user if needed
async function initializeDefaultUser() {
  try {
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      const newUser = new User({
        username: 'admin',
        password: 'admin123'
      });
      
      await newUser.save();
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
}

// Initialize default user
initializeDefaultUser();

export const storage = new MongoDBStorage();
