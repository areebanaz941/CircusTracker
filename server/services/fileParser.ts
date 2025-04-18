import * as fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { InsertCircusShow } from '@shared/schema';

type ProcessResult = {
  success: boolean;
  message: string;
  data: Partial<InsertCircusShow>[];
};

/**
 * Process uploaded file (CSV or Excel) and extract circus show data
 */
export async function processFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<ProcessResult> {
  try {
    let data: any[] = [];
    
    if (fileName.endsWith('.csv')) {
      // Parse CSV file
      data = csvParse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return {
        success: false,
        message: 'Unsupported file format. Please upload a CSV or Excel file.',
        data: [],
      };
    }
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: 'The file contains no data.',
        data: [],
      };
    }
    
    // Validate and transform the data
    const transformedData = transformShowData(data);
    
    if (transformedData.length === 0) {
      return {
        success: false,
        message: 'No valid records found in the file.',
        data: [],
      };
    }
    
    return {
      success: true,
      message: `Successfully processed ${transformedData.length} records.`,
      data: transformedData,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error processing file: ${(error as Error).message}`,
      data: [],
    };
  }
}

/**
 * Transform raw data from file into circus show objects
 */
function transformShowData(rawData: any[]): Partial<InsertCircusShow>[] {
  const transformedData: Partial<InsertCircusShow>[] = [];
  
  for (const row of rawData) {
    try {
      // Extract coordinates
      let latitude, longitude;
      if (row.COORDS || row.Coords || row.coords) {
        const coordsStr = row.COORDS || row.Coords || row.coords;
        const coordParts = coordsStr.split(',').map((part: string) => part.trim());
        
        if (coordParts.length === 2) {
          [latitude, longitude] = coordParts;
        }
      }
      
      // Determine show date field
      let showDate;
      const dateField = row['Show Date'] || row['SHOW DATE'] || row.showDate || row['Show date'];
      
      if (dateField) {
        // Parse date from various formats
        showDate = new Date(dateField);
        
        // Check if date is valid
        if (isNaN(showDate.getTime())) {
          console.warn(`Invalid date format: ${dateField}`);
          continue;
        }
      } else {
        console.warn('No show date field found in row');
        continue;
      }
      
      // Map fields to schema
      const showData: Partial<InsertCircusShow> = {
        circusName: row['CIRCUS NAME'] || row['Circus Name'] || row.circusName || '',
        venueName: row['VENUE NAME'] || row['Venue Name'] || row.venueName || '',
        address: row.ADDRESS || row.Address || row.address || '',
        city: row.CITY || row.City || row.city || '',
        state: row.STATE || row.State || row.state || '',
        zip: row.ZIP || row.Zip || row.zip || '',
        latitude: latitude || '',
        longitude: longitude || '',
        showDate,
      };
      
      // Skip rows with missing required data
      if (!showData.circusName || !showData.latitude || !showData.longitude || !showData.showDate) {
        console.warn('Missing required fields in row', showData);
        continue;
      }
      
      transformedData.push(showData);
    } catch (error) {
      console.error('Error transforming row:', error);
    }
  }
  
  return transformedData;
}
