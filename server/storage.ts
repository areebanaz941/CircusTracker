import { CircusShowWithCoords, CircusVenue } from '@shared/schema';
import { User, CircusShow, FileUpload, connectDB, ensureAdminExists } from './db';

// Try to connect to MongoDB
connectDB().then(connected => {
  if (connected) {
    // Ensure admin user exists in MongoDB
    ensureAdminExists();
  }
});

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Show methods
  getAllShows(): Promise<CircusShowWithCoords[]>;
  getShowsByDate(date: string): Promise<CircusShowWithCoords[]>;
  createShow(show: any): Promise<any>;
  getShowDateRange(): Promise<{ startDate: string; endDate: string }>;
  getVenues(): Promise<CircusVenue[]>;
  
  // File upload methods
  getFileUploads(): Promise<any[]>;
  getFileById(fileName: string): Promise<any | undefined>;
  createFileUpload(upload: any, fileBuffer?: Buffer): Promise<any>;
  deleteFileAndShows(fileName: string): Promise<void>;
}

// In-memory storage implementation for fallback
export class MemStorage implements IStorage {
  private users: Map<string, any>;
  private shows: Map<string, any>;
  private fileUploads: any[];
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
      username: "admin1@gmail.com",
      password: "salt:hash", // This will be replaced with a properly hashed version of CircusMapping@12
      role: "admin"
    });

    // Load sample data (if needed)
    this.loadSampleData();
  }

  // Sample data for testing
  private async loadSampleData() {
    try {
      // Check if we already have data
      if (this.shows.size > 0) return;

      // Sample circus data for April 2025
      const sampleShows = [
        {
          circusName: "Big Top Circus",
          venueName: "Central Park",
          address: "5th Ave",
          city: "New York",
          state: "NY",
          zip: "10022",
          latitude: "40.7736",
          longitude: "-73.9566",
          showDate: new Date("2025-04-15"),
          fileName: "sample.csv"
        },
        {
          circusName: "Cirque du Wonder",
          venueName: "Millennium Park",
          address: "201 E Randolph St",
          city: "Chicago",
          state: "IL",
          zip: "60602",
          latitude: "41.8826",
          longitude: "-87.6226",
          showDate: new Date("2025-04-20"),
          fileName: "sample.csv"
        },
        {
          circusName: "Amazing Acrobats",
          venueName: "Golden Gate Park",
          address: "501 Stanyan St",
          city: "San Francisco",
          state: "CA",
          zip: "94117",
          latitude: "37.7701",
          longitude: "-122.4569",
          showDate: new Date("2025-04-25"),
          fileName: "sample.csv"
        }
      ];

      // Add the sample shows
      for (const show of sampleShows) {
        await this.createShow(show);
      }

      // Record the file upload
      await this.createFileUpload({
        fileName: "sample.csv",
        uploadDate: new Date(),
        status: "success",
        recordCount: sampleShows.length,
        fileType: "csv"
      });

    } catch (error) {
      console.error("Error loading sample data:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: any): Promise<any> {
    const id = this.currentUserId.toString();
    this.currentUserId++;
    const newUser = { 
      _id: id,
      ...user,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return { ...newUser };
  }
  
  // Show methods
  async getAllShows(): Promise<CircusShowWithCoords[]> {
    return Array.from(this.shows.values()).map(show => ({
      ...show,
      id: show._id,
      coords: [parseFloat(show.latitude), parseFloat(show.longitude)]
    }));
  }
  
  async getShowsByDate(dateStr: string): Promise<CircusShowWithCoords[]> {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);
    
    return Array.from(this.shows.values())
      .filter(show => {
        const showDate = new Date(show.showDate);
        return showDate >= targetDate && showDate <= endDate;
      })
      .map(show => ({
        ...show,
        id: show._id,
        coords: [parseFloat(show.latitude), parseFloat(show.longitude)]
      }));
  }
  
  async createShow(show: any): Promise<any> {
    const id = this.currentShowId.toString();
    this.currentShowId++;
    
    const newShow = {
      _id: id,
      ...show,
      uploadedAt: new Date()
    };
    
    this.shows.set(id, newShow);
    return { ...newShow };
  }
  
  async getShowDateRange(): Promise<{ startDate: string; endDate: string }> {
    const shows = Array.from(this.shows.values());
    
    if (shows.length === 0) {
      // Default date range if no shows
      return {
        startDate: new Date("2025-04-01").toISOString(),
        endDate: new Date("2025-04-30").toISOString(),
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
      shows: any[];
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
  async getFileUploads(): Promise<any[]> {
    return [...this.fileUploads];
  }
  
  async getFileById(fileName: string): Promise<any | undefined> {
    return this.fileUploads.find(upload => upload.fileName === fileName);
  }
  
  async createFileUpload(upload: any, fileBuffer?: Buffer): Promise<any> {
    const newUpload = {
      _id: Date.now().toString(),
      ...upload,
      fileContent: fileBuffer || Buffer.from([]), // Store the file content
    };
    this.fileUploads.push(newUpload);
    return { ...newUpload };
  }
  
  async deleteFileAndShows(fileName: string): Promise<void> {
    // Remove file from uploads
    this.fileUploads = this.fileUploads.filter(upload => upload.fileName !== fileName);
    
    // Remove associated shows
    const showIds: string[] = [];
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
          endDate: new Date("2025-04-30").toISOString(),
        };
      }
      
      const earliestShow = await CircusShow.findOne().sort({ showDate: 1 });
      const latestShow = await CircusShow.findOne().sort({ showDate: -1 });
      
      if (!earliestShow || !latestShow) {
        return {
          startDate: new Date("2025-04-01").toISOString(),
          endDate: new Date("2025-04-30").toISOString(),
        };
      }
      
      return {
        startDate: earliestShow.showDate.toISOString(),
        endDate: latestShow.showDate.toISOString(),
      };
    } catch (error) {
      console.error('Error getting show date range:', error);
      return {
        startDate: new Date("2025-04-01").toISOString(),
        endDate: new Date("2025-04-30").toISOString(),
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
      return uploads.map(upload => {
        const uploadObj = upload.toObject();
        // Don't return the file content in the list
        delete uploadObj.fileContent;
        return uploadObj;
      });
    } catch (error) {
      console.error('Error getting file uploads:', error);
      return [];
    }
  }
  
  async getFileById(fileName: string): Promise<any | undefined> {
    try {
      const upload = await FileUpload.findOne({ fileName });
      return upload ? upload.toObject() : undefined;
    } catch (error) {
      console.error('Error getting file by ID:', error);
      return undefined;
    }
  }
  
  async createFileUpload(upload: any, fileBuffer?: Buffer): Promise<any> {
    try {
      // Add the file buffer to the upload record
      const fileUploadData = {
        ...upload,
        fileContent: fileBuffer, // Store the actual file content
        fileType: upload.fileName.split('.').pop().toLowerCase() // Extract file type from extension
      };
      
      const newUpload = new FileUpload(fileUploadData);
      const savedUpload = await newUpload.save();
      
      // Remove the file content from the returned object for API responses
      const uploadObj = savedUpload.toObject();
      delete uploadObj.fileContent;
      
      return uploadObj;
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

// Function to check MongoDB connection
async function checkMongoDBConnection(): Promise<boolean> {
  try {
    // Try to find a user, if it doesn't throw, we're connected
    await User.findOne().maxTimeMS(2000);
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return false;
  }
}

// Choose the appropriate storage implementation 
let storage: IStorage;

(async () => {
  const isMongoDBConnected = await checkMongoDBConnection();
  
  if (isMongoDBConnected) {
    console.log('Using MongoDB storage');
    storage = new MongoDBStorage();
  } else {
    console.log('Using in-memory storage');
    storage = new MemStorage();
  }
})();

// Export the storage instance
export { storage };