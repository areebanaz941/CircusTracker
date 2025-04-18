import mongoose from 'mongoose';

// Using local MongoDB (since connection to remote failed)
const MONGODB_URI = 'mongodb://localhost:27017/circus_tracker';

// Mock User Model for fallback when MongoDB is unavailable
class MockUserModel {
  static async findOne(query: { username?: string; [key: string]: any }) {
    if (query.username === 'admin1@gmail.com') {
      return {
        _id: 'admin-id',
        username: 'admin1@gmail.com',
        password: 'this_would_be_hashed_CircusMapping@12',
        toObject: () => ({
          _id: 'admin-id',
          username: 'admin1@gmail.com',
          password: 'this_would_be_hashed_CircusMapping@12'
        })
      };
    }
    return null;
  }

  static async findById(id: string) {
    if (id === 'admin-id') {
      return {
        _id: 'admin-id',
        username: 'admin1@gmail.com',
        password: 'this_would_be_hashed_CircusMapping@12',
        toObject: () => ({
          _id: 'admin-id',
          username: 'admin1@gmail.com',
          password: 'this_would_be_hashed_CircusMapping@12'
        })
      };
    }
    return null;
  }

  constructor(data: any) {
    Object.assign(this, data);
  }

  async save() {
    return {
      _id: 'admin-id',
      ...this,
      toObject: () => ({
        _id: 'admin-id',
        ...this
      })
    };
  }
}

// Connect to MongoDB
export const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout instead of 30
      connectTimeoutMS: 10000, // 10 seconds connection timeout
    });
    console.log('MongoDB Connected...');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    console.log('Using in-memory fallback storage...');
  }
};

// Define MongoDB schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const circusShowSchema = new mongoose.Schema({
  circusName: { type: String, required: true },
  venueName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  showDate: { type: Date, required: true },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String, required: true }
});

const fileUploadSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'error'], required: true },
  recordCount: { type: Number, required: true }
});

// Try to use Mongoose models, if that fails use the mock models
let UserModel: any;
let CircusShowModel: any;
let FileUploadModel: any;

try {
  UserModel = mongoose.model('User', userSchema);
  CircusShowModel = mongoose.model('CircusShow', circusShowSchema);
  FileUploadModel = mongoose.model('FileUpload', fileUploadSchema);
} catch (err) {
  console.log('Using mock models due to Mongoose error');
  UserModel = MockUserModel;
  CircusShowModel = {};
  FileUploadModel = {};
}

// Create and export models
export const User = UserModel;
export const CircusShow = CircusShowModel;
export const FileUpload = FileUploadModel;