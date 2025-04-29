// Modified version of your db.ts file
import mongoose from 'mongoose';
import crypto from 'crypto';

// Use environment variable for MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/circus';

// Rest of your code remains the same...
// Connect to MongoDB
export const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout instead of 30
      connectTimeoutMS: 10000, // 10 seconds connection timeout
    });
    console.log('MongoDB Connected Successfully...');
    return true;
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    console.log('Using in-memory fallback storage...');
    return false;
  }
};

// Hash password function
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Define MongoDB schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
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
  recordCount: { type: Number, required: true },
  fileContent: { type: Buffer }, // Store the actual file content
  fileType: { type: String } // Store the file type (csv or excel)
});

// Create models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const CircusShow = mongoose.models.CircusShow || mongoose.model('CircusShow', circusShowSchema);
export const FileUpload = mongoose.models.FileUpload || mongoose.model('FileUpload', fileUploadSchema);

// Ensure admin user exists
export const ensureAdminExists = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin1@gmail.com' });
    
    if (!adminExists) {
      const password = 'CircusMapping@12';
      const hashedPassword = hashPassword(password);
      
      const adminUser = new User({
        username: 'admin1@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('Admin user created successfully in MongoDB');
    } else {
      console.log('Admin user already exists in MongoDB');
    }
  } catch (error) {
    console.error('Error ensuring admin exists:', error);
  }
};