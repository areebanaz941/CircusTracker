import mongoose from 'mongoose';

// Using local MongoDB (since connection to remote failed)
const MONGODB_URI = 'mongodb://localhost:27017/circus_tracker';

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

// Create and export models
export const User = mongoose.model('User', userSchema);
export const CircusShow = mongoose.model('CircusShow', circusShowSchema);
export const FileUpload = mongoose.model('FileUpload', fileUploadSchema);