import mongoose from 'mongoose';

// MongoDB connection URI - Encode the @ in the password
const MONGODB_URI = 'mongodb+srv://areebanaz4848:Pakistan%4012@cluster0.zdijmho.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
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