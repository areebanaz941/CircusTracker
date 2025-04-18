import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to upload file to the API
async function uploadFile() {
  try {
    const filePath = path.join(__dirname, 'circus_data.csv');
    const stats = fs.statSync(filePath);
    
    if (!stats.isFile()) {
      console.error('Error: circus_data.csv not found');
      return;
    }
    
    console.log(`File size: ${stats.size} bytes`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: 'circus_data.csv',
      contentType: 'text/csv',
    });
    
    // Upload to API
    console.log('Uploading file to API...');
    const response = await axios.post('http://localhost:5000/api/uploads', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('Upload response:', response.data);
  } catch (error) {
    console.error('Error uploading file:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the upload
uploadFile();