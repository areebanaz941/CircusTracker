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
    let fileType = '';
    
    if (fileName.toLowerCase().endsWith('.csv')) {
      // Parse CSV file
      data = csvParse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        skipEmptyLines: true,
      });
      fileType = 'csv';
    } else if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, {
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
      fileType = fileName.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'xls';
    } else {
      return {
        success: false,
        message: 'Unsupported file format. Please upload a CSV or Excel file.',
        data: [],
      };
    }
    
    console.log(`Processed ${fileName}, file type: ${fileType}, rows: ${data.length}`);
    
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
    console.error('Error processing file:', error);
    return {
      success: false,
      message: `Error processing file: ${(error as Error).message}`,
      data: [],
    };
  }
}

/**
 * Transform raw data from file into circus show objects
 * Handles various column name formats
 */
function transformShowData(rawData: any[]): Partial<InsertCircusShow>[] {
  const transformedData: Partial<InsertCircusShow>[] = [];
  
  for (const row of rawData) {
    try {
      // Extract coordinates
      let latitude, longitude;
      if ('COORDS' in row || 'Coords' in row || 'coords' in row) {
        const coordsStr = row.COORDS || row.Coords || row.coords;
        const coordParts = coordsStr?.split(',').map((part: string) => part.trim());
        
        if (coordParts?.length === 2) {
          [latitude, longitude] = coordParts;
        }
      } else {
        // Try to get latitude and longitude as separate fields
        latitude = row.LATITUDE || row.Latitude || row.latitude;
        longitude = row.LONGITUDE || row.Longitude || row.longitude;
      }
      
      // Determine show date field
      let showDate;
      const dateField = 
        row['Show Date'] || 
        row['SHOW DATE'] || 
        row.showDate || 
        row['Show date'] || 
        row.Date ||
        row.date ||
        row.DATE;
      
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
      
      // Map fields to schema (case insensitive approach)
      const showData: Partial<InsertCircusShow> = {
        circusName: findValueIgnoreCase(row, ['CIRCUS NAME', 'Circus Name', 'circusName', 'circus_name', 'circus']),
        venueName: findValueIgnoreCase(row, ['VENUE NAME', 'Venue Name', 'venueName', 'venue_name', 'venue']),
        address: findValueIgnoreCase(row, ['ADDRESS', 'Address', 'address', 'addr']),
        city: findValueIgnoreCase(row, ['CITY', 'City', 'city']),
        state: findValueIgnoreCase(row, ['STATE', 'State', 'state']),
        zip: findValueIgnoreCase(row, ['ZIP', 'Zip', 'zip', 'zipcode', 'postal_code']),
        latitude: latitude || '',
        longitude: longitude || '',
        showDate,
      };
      
      // Skip rows with missing required data
      if (!showData.circusName || (!showData.latitude || !showData.longitude) || !showData.showDate) {
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

/**
 * Helper function to find a value in an object using multiple possible keys (case insensitive)
 */
function findValueIgnoreCase(obj: any, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    if (key in obj && obj[key]) {
      return obj[key];
    }
  }
  
  // Try case-insensitive search
  const lowerCaseKeys = possibleKeys.map(k => k.toLowerCase());
  for (const objKey in obj) {
    const lowerObjKey = objKey.toLowerCase();
    if (lowerCaseKeys.includes(lowerObjKey) && obj[objKey]) {
      return obj[objKey];
    }
  }
  
  return '';
}