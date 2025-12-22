import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import mammoth from 'mammoth';

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (filePath) => {
  try {
    // Dynamic import for CommonJS module
    const pdf = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

/**
 * Convert Excel serial date to YYYY-MM-DD format
 */
const excelDateToJSDate = (serial) => {
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a value is an Excel date serial number
 */
const isExcelDateSerial = (value) => {
  // Excel dates are typically between 1 (Jan 1, 1900) and ~50000 (year 2037+)
  if (typeof value === 'number') {
    return value >= 1 && value <= 100000;
  }
  return false;
};

/**
 * Format date from various Excel formats to string
 */
const formatDateFromExcel = (cellValue) => {
  if (!cellValue) return null;
  
  // If it's already a string with date pattern, parse it properly
  const cellStr = String(cellValue).trim();
  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
  const dateMatch = cellStr.match(datePattern);
  
  if (dateMatch) {
    let day, month, year;
    const part1 = parseInt(dateMatch[1]);
    const part2 = parseInt(dateMatch[2]);
    const part3 = parseInt(dateMatch[3]);
    
    // Determine format: DD/MM/YYYY or MM/DD/YYYY
    // Strategy: 
    // - If part1 > 12, it MUST be day in DD/MM/YYYY (can't be month)
    // - If part2 > 12, it MUST be day in MM/DD/YYYY (can't be day in DD/MM)
    // - If both <= 12, it's ambiguous - default to DD/MM/YYYY for international format
    //   (which is common in many regions and matches the pattern when days > 12)
    
    if (part1 > 12) {
      // First part > 12, must be day in DD/MM/YYYY format
      day = part1;
      month = part2;
      year = part3;
    } else if (part2 > 12) {
      // Second part > 12, must be day in MM/DD/YYYY format
      month = part1;
      day = part2;
      year = part3;
    } else {
      // Both <= 12, ambiguous - default to DD/MM/YYYY (international format)
      // This matches the pattern we see in the file (29/8, 25/10, 21/12)
      day = part1;
      month = part2;
      year = part3;
    }
    
    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    // Validate and format
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // If it's a number, check if it's an Excel date serial
  if (typeof cellValue === 'number') {
    if (isExcelDateSerial(cellValue)) {
      return excelDateToJSDate(cellValue);
    }
  }
  
  // Try to parse as Date object
  const dateObj = new Date(cellValue);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

/**
 * Extract text from Excel file
 * Improved to preserve column structure for better PSA data extraction
 * Uses direct cell access to ensure correct pairing
 */
const extractTextFromExcel = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    let text = '';
    let structuredData = [];
    
    // Extract text from all sheets
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the range of the sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // First, find the header row and column indices
      let dateColumnIndex = -1;
      let valueColumnIndex = -1;
      let headerRowIndex = -1;
      
      console.log(`[PSA Excel Parser] ===== HEADER DETECTION START =====`);
      console.log(`[PSA Excel Parser] Sheet: ${sheetName}, Range: ${worksheet['!ref']}`);
      
      // Scan first 10 rows to find headers
      for (let row = 0; row <= Math.min(10, range.e.r); row++) {
        for (let col = 0; col <= Math.min(10, range.e.c); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          if (!cell) continue;
          
          const cellValue = cell.v || cell.w || '';
          const cellStr = String(cellValue).trim().toLowerCase();
          
          console.log(`[PSA Excel Parser] Checking cell ${cellAddress} (row ${row}, col ${col}): "${cellStr}"`);
          
          if (cellStr.includes('date') && dateColumnIndex === -1) {
            dateColumnIndex = col;
            headerRowIndex = row;
            console.log(`[PSA Excel Parser]   → Found DATE header at column ${col}, row ${row}`);
          }
          if ((cellStr.includes('psa') || cellStr.includes('value')) && valueColumnIndex === -1) {
            valueColumnIndex = col;
            if (headerRowIndex === -1) headerRowIndex = row;
            console.log(`[PSA Excel Parser]   → Found PSA/VALUE header at column ${col}, row ${row}`);
          }
        }
        if (dateColumnIndex >= 0 && valueColumnIndex >= 0) {
          console.log(`[PSA Excel Parser] Headers found! Breaking search.`);
          break;
        }
      }
      
      console.log(`[PSA Excel Parser] ===== HEADER DETECTION COMPLETE =====`);
      console.log(`[PSA Excel Parser] Date column: ${dateColumnIndex}, Value column: ${valueColumnIndex}, Header row: ${headerRowIndex}`);
      
      // If headers not found, try to detect by content
      if (dateColumnIndex === -1 || valueColumnIndex === -1) {
        for (let row = 0; row <= Math.min(20, range.e.r); row++) {
          for (let col = 0; col <= Math.min(10, range.e.c); col++) {
            const cellAddress1 = XLSX.utils.encode_cell({ r: row, c: col });
            const cellAddress2 = XLSX.utils.encode_cell({ r: row, c: col + 1 });
            const cell1 = worksheet[cellAddress1];
            const cell2 = worksheet[cellAddress2];
            
            if (!cell1 || !cell2) continue;
            
            const val1 = String(cell1.v || cell1.w || '').trim();
            const val2 = String(cell2.v || cell2.w || '').trim();
            
            const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/;
            const numPattern = /^\d+\.?\d*$/;
            
            if (datePattern.test(val1) && numPattern.test(val2)) {
              const numVal = parseFloat(val2);
              if (!isNaN(numVal) && numVal >= 0.1 && numVal <= 100) {
                if (dateColumnIndex === -1) dateColumnIndex = col;
                if (valueColumnIndex === -1) valueColumnIndex = col + 1;
                break;
              }
            }
          }
          if (dateColumnIndex >= 0 && valueColumnIndex >= 0) break;
        }
      }
      
      // Get data as array of arrays - use raw: true to get actual values, not formatted strings
      const sheetDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true, dateNF: 'yyyy-mm-dd' });
      // Also get formatted version for date strings
      const sheetDataFormatted = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      
      // If we identified columns, extract data directly from cells
      if (dateColumnIndex >= 0 && valueColumnIndex >= 0) {
        console.log(`[PSA Excel Parser] ===== EXTRACTION START =====`);
        console.log(`[PSA Excel Parser] Found columns - Date: ${dateColumnIndex}, Value: ${valueColumnIndex}, Header row: ${headerRowIndex}`);
        console.log(`[PSA Excel Parser] Sheet range: ${worksheet['!ref']}`);
        console.log(`[PSA Excel Parser] Range object:`, range);
        
        // Start from after the header row (if found) or from row 0
        const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
        console.log(`[PSA Excel Parser] Starting extraction from row: ${startRow} to ${range.e.r}`);
        
        // Extract data row by row using direct cell access
        for (let rowIndex = startRow; rowIndex <= range.e.r; rowIndex++) {
          // Get date cell directly
          const dateCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: dateColumnIndex });
          const dateCell = worksheet[dateCellAddress];
          
          // Get value cell directly
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: valueColumnIndex });
          const valueCell = worksheet[valueCellAddress];
          
          console.log(`[PSA Excel Parser] Row ${rowIndex}: Checking cells ${dateCellAddress} and ${valueCellAddress}`);
          console.log(`[PSA Excel Parser]   Date cell exists: ${!!dateCell}, Value cell exists: ${!!valueCell}`);
          
          // Skip if either cell is missing
          if (!dateCell || !valueCell) {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - missing cells`);
            continue;
          }
          
          // Get raw values
          const dateCellRaw = dateCell.v;
          const valueCellRaw = valueCell.v;
          
          // Get formatted values (for dates that might be formatted)
          const dateCellFormatted = dateCell.w || dateCell.v;
          const valueCellFormatted = valueCell.w || valueCell.v;
          
          console.log(`[PSA Excel Parser]   Date cell - raw: ${dateCellRaw} (type: ${typeof dateCellRaw}), formatted: ${dateCellFormatted}`);
          console.log(`[PSA Excel Parser]   Value cell - raw: ${valueCellRaw} (type: ${typeof valueCellRaw}), formatted: ${valueCellFormatted}`);
          console.log(`[PSA Excel Parser]   Date cell object:`, JSON.stringify({
            v: dateCell.v,
            w: dateCell.w,
            t: dateCell.t,
            z: dateCell.z
          }));
          console.log(`[PSA Excel Parser]   Value cell object:`, JSON.stringify({
            v: valueCell.v,
            w: valueCell.w,
            t: valueCell.t,
            z: valueCell.z
          }));
          
          // Skip if both date values are empty
          if ((dateCellRaw === null || dateCellRaw === undefined || dateCellRaw === '') &&
              (dateCellFormatted === null || dateCellFormatted === undefined || dateCellFormatted === '')) {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - empty date`);
            continue;
          }
          
          // Skip if both value values are empty
          if ((valueCellRaw === null || valueCellRaw === undefined || valueCellRaw === '') &&
              (valueCellFormatted === null || valueCellFormatted === undefined || valueCellFormatted === '')) {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - empty value`);
            continue;
          }
          
          // Format date - try raw first, then formatted
          let dateStr = null;
          if (dateCellRaw !== null && dateCellRaw !== undefined && dateCellRaw !== '') {
            dateStr = formatDateFromExcel(dateCellRaw);
            console.log(`[PSA Excel Parser]   Date from raw (${dateCellRaw}): ${dateStr}`);
          }
          if (!dateStr && dateCellFormatted !== null && dateCellFormatted !== undefined && dateCellFormatted !== '') {
            dateStr = formatDateFromExcel(dateCellFormatted);
            console.log(`[PSA Excel Parser]   Date from formatted (${dateCellFormatted}): ${dateStr}`);
          }
          
          if (!dateStr) {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - could not parse date`);
            continue;
          }
          
          // Get value - prefer raw to preserve decimals exactly
          let valueStr = null;
          
          // Try raw value first (preserves decimals exactly)
          if (valueCellRaw !== null && valueCellRaw !== undefined && valueCellRaw !== '') {
            if (typeof valueCellRaw === 'number') {
              // For numbers, preserve exact decimal representation
              // Check if it has decimal part
              if (valueCellRaw % 1 !== 0) {
                // Has decimals - use toFixed with enough precision, then remove trailing zeros
                valueStr = valueCellRaw.toFixed(10).replace(/\.?0+$/, '');
                console.log(`[PSA Excel Parser]   Value from raw number (${valueCellRaw}): ${valueStr} (has decimals)`);
              } else {
                // Integer - convert to string
                valueStr = valueCellRaw.toString();
                console.log(`[PSA Excel Parser]   Value from raw number (${valueCellRaw}): ${valueStr} (integer)`);
              }
            } else {
              // Already a string - use as is
              valueStr = String(valueCellRaw).trim();
              console.log(`[PSA Excel Parser]   Value from raw string (${valueCellRaw}): ${valueStr}`);
            }
          }
          
          // If raw didn't work, try formatted (but this might lose decimals)
          if (!valueStr || valueStr === '') {
            if (valueCellFormatted !== null && valueCellFormatted !== undefined && valueCellFormatted !== '') {
              valueStr = String(valueCellFormatted).trim();
              console.log(`[PSA Excel Parser]   Value from formatted (${valueCellFormatted}): ${valueStr}`);
            }
          }
          
          if (!valueStr || valueStr === '') {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - empty value string`);
            continue;
          }
          
          // Validate number pattern - allow decimals
          const numPattern = /^\d+\.?\d*$/;
          if (!numPattern.test(valueStr)) {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - value "${valueStr}" doesn't match number pattern`);
            continue;
          }
          
          const numVal = parseFloat(valueStr);
          console.log(`[PSA Excel Parser]   Parsed value: ${numVal}`);
          
          // PSA values are typically 0.1 to 100
          if (!isNaN(numVal) && numVal >= 0.1 && numVal <= 100) {
            console.log(`[PSA Excel Parser]   ✓ VALID PAIR - Row ${rowIndex}: Date=${dateStr}, Value=${valueStr}`);
            structuredData.push({
              date: dateStr,
              value: valueStr,
              row: rowIndex
            });
          } else {
            console.log(`[PSA Excel Parser]   Skipping row ${rowIndex} - value ${numVal} out of range (0.1-100)`);
          }
        }
        
        console.log(`[PSA Excel Parser] ===== EXTRACTION COMPLETE =====`);
        console.log(`[PSA Excel Parser] Total entries extracted: ${structuredData.length}`);
        console.log(`[PSA Excel Parser] Extracted data:`, JSON.stringify(structuredData, null, 2));
      } else {
        console.log(`[PSA Excel Parser] ERROR: Could not identify date and value columns`);
        console.log(`[PSA Excel Parser] Date column: ${dateColumnIndex}, Value column: ${valueColumnIndex}`);
      }
      
      // If we found structured data, format it for parsing
      if (structuredData.length > 0) {
        structuredData.forEach(item => {
          text += `${item.date} ${item.value}\n`;
        });
      } else {
        // Fallback: try to find date-value pairs in same row
        sheetDataFormatted.forEach((row, rowIndex) => {
          if (Array.isArray(row) && row.length > 0) {
            let dateValue = null;
            let numberValue = null;
            
            row.forEach((cell) => {
              if (cell !== null && cell !== undefined && cell !== '') {
                const cellStr = String(cell).trim();
                
                // Check if cell contains a date pattern
                const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/;
                if (datePattern.test(cellStr) && !dateValue) {
                  dateValue = cellStr;
                }
                
                // Check if cell is a number (PSA value)
                const numPattern = /^\d+\.?\d*$/;
                if (numPattern.test(cellStr)) {
                  const numVal = parseFloat(cellStr);
                  if (!isNaN(numVal) && numVal >= 0.1 && numVal <= 100 && !numberValue) {
                    numberValue = cellStr;
                  }
                }
              }
            });
            
            // If we found both date and number in the same row, add to text
            if (dateValue && numberValue) {
              text += `${dateValue} ${numberValue}\n`;
            } else {
              // Otherwise, join all cells with space (original behavior)
              const rowText = row.filter(cell => cell !== null && cell !== undefined && cell !== '').join(' ');
              if (rowText.trim()) {
                text += rowText + '\n';
              }
            }
          }
        });
      }
    });
    
    return text;
  } catch (error) {
    console.error('Error extracting text from Excel:', error);
    throw new Error('Failed to extract text from Excel file');
  }
};

/**
 * Extract text from Word document
 */
const extractTextFromWord = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word document:', error);
    throw new Error('Failed to extract text from Word document');
  }
};

/**
 * Extract text from CSV file
 */
const extractTextFromCSV = async (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading CSV file:', error);
    throw new Error('Failed to read CSV file');
  }
};

/**
 * Extract text from image using OCR
 */
const extractTextFromImage = async (filePath) => {
  try {
    // Dynamic import to handle optional dependency
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    // If OCR fails, return empty string - user can still manually enter data
    console.warn('OCR not available or failed, returning empty text');
    return '';
  }
};

/**
 * Parse PSA values and dates from text
 */
const parsePSAData = (text) => {
  const psaEntries = [];
  
  // Split text into lines for better parsing
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Pattern to match numeric dates: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const numericDatePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
  
  // Pattern to match written dates: "October 12, 2024", "May 05, 2023", etc.
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthPattern = monthNames.join('|');
  const writtenDatePattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi');
  
  // Combined date pattern (for initial matching)
  const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
  
  // Pattern to match decimal numbers (PSA values are typically 0.1 to 100 with decimals)
  // Exclude numbers that are part of dates by checking context
  const decimalNumberPattern = /\b(\d+\.\d+|\d+)\b/g;
  
  // Helper function to check if a number is part of a date
  const isPartOfDate = (text, numIndex, numStr) => {
    // Check the immediate context around the number
    const charBefore = numIndex > 0 ? text[numIndex - 1] : ' ';
    const charAfter = numIndex + numStr.length < text.length ? text[numIndex + numStr.length] : ' ';
    
    // If the number is immediately adjacent to date separators, it's part of a date
    if (charBefore === '/' || charBefore === '-' || charAfter === '/' || charAfter === '-') {
      return true;
    }
    
    // Check if it's a year (4 digits starting with 19 or 20)
    if (numStr.length === 4 && (numStr.startsWith('19') || numStr.startsWith('20'))) {
      return true;
    }
    
    // Check broader context for date patterns
    const before = text.substring(Math.max(0, numIndex - 15), numIndex);
    const after = text.substring(numIndex + numStr.length, Math.min(text.length, numIndex + numStr.length + 15));
    const context = before + numStr + after;
    
    // Check if it's part of a complete date pattern (DD/MM/YYYY, MM/DD/YYYY, etc.)
    const dateContextPattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    if (dateContextPattern.test(context)) {
      return true;
    }
    
    // For non-decimal numbers 1-31, check if they're part of a date
    const numValue = parseInt(numStr);
    if (!numStr.includes('.') && numValue >= 1 && numValue <= 31) {
      // If there's a slash or dash nearby, it's likely part of a date
      if (/\d{1,2}[\/\-]/.test(before) || /[\/\-]\d{1,2}/.test(after)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Process each line to find date-value pairs
  lines.forEach((line, lineIndex) => {
    // Find all dates in this line
    const dateMatches = [...line.matchAll(datePattern)];
    
    // Find all numbers in this line (prioritize decimals)
    // Use a more specific pattern that captures decimals properly
    const numberMatches = [];
    const numberPattern = /\b(\d+\.\d+|\d+)\b/g;
    let match;
    while ((match = numberPattern.exec(line)) !== null) {
      const numStr = match[0];
      const numIndex = match.index;
      const numValue = parseFloat(numStr);
      
      // Skip if this number is part of a date
      if (isPartOfDate(line, numIndex, numStr)) {
        continue;
      }
      
      // Only consider valid PSA values (0.1 to 100)
      // STRICTLY prefer decimal values (they're almost certainly PSA values, not dates)
      if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 100) {
        // For non-decimal numbers, be more strict - they might be dates
        // Only include if they're clearly not part of a date pattern
        if (!numStr.includes('.')) {
          // Non-decimal numbers: only accept if they're clearly separated from dates
          // and are reasonable PSA values (typically 1-10 for whole numbers)
          if (numValue > 10) {
            // Whole numbers > 10 are less likely to be PSA values, skip them
            continue;
          }
        }
        
        // Prioritize decimal numbers (they're more likely to be PSA values)
        const priority = numStr.includes('.') ? 1 : 2;
        numberMatches.push({ 
          value: numValue, 
          original: numStr, 
          index: numIndex,
          priority: priority
        });
      }
    }
    
    // Sort by priority (decimals first) and then by position
    numberMatches.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.index - b.index;
    });
    
    // If we have dates and numbers on the same line, pair them
    // Handle multiple pairs on the same line (e.g., table format)
    if (dateMatches.length > 0 && numberMatches.length > 0) {
      // Create pairs by matching each date with the closest number
      // Track used numbers to avoid double-matching
      const usedNumbers = new Set();
      
      dateMatches.forEach((dateMatch, dateIdx) => {
        const dateStr = dateMatch[0];
        const dateIndex = dateMatch.index;
        
        // Find the number closest to this date (prefer numbers after the date)
        let bestMatch = null;
        let minDistance = Infinity;
        let bestMatchIndex = -1;
        
        numberMatches.forEach((numMatch, numIdx) => {
          // Skip if this number was already used
          if (usedNumbers.has(numIdx)) return;
          
          // Calculate distance (prefer numbers after the date)
          const distance = Math.abs(numMatch.index - dateIndex);
          
          // Prefer numbers that come after the date on the same line
          if (numMatch.index > dateIndex && distance < minDistance) {
            minDistance = distance;
            bestMatch = numMatch;
            bestMatchIndex = numIdx;
          } else if (!bestMatch && distance < minDistance) {
            // Fallback to closest number if no number after date
            minDistance = distance;
            bestMatch = numMatch;
            bestMatchIndex = numIdx;
          }
        });
        
        if (bestMatch && bestMatchIndex >= 0) {
          const date = parseDate(dateStr);
          if (date) {
            // Preserve the original decimal format - ensure we keep the decimal point
            let resultValue = bestMatch.original;
            
            // Double-check: if original doesn't have decimal but value is a float, preserve decimal
            if (!resultValue.includes('.') && bestMatch.value % 1 !== 0) {
              // This shouldn't happen, but just in case
              resultValue = bestMatch.value.toFixed(1);
            }
            
            // Mark this number as used
            usedNumbers.add(bestMatchIndex);
            
            psaEntries.push({
              testDate: date,
              result: resultValue,
              status: getPSAStatus(bestMatch.value),
              notes: `Extracted from file`
            });
          }
        }
      });
    }
  });
  
  // First, try to match written date formats with PSA values
  // Pattern: "October 12, 2024: PSA value - 2.1" or "October 12, 2024 PSA value - 2.1"
  const fullText = text;
  
  // More flexible pattern that handles various formats
  // Matches: "October 12, 2024: PSA value - 2.1"
  // Matches: "October 12, 2024 PSA value - 2.1"
  // Matches: "October 12, 2024: 2.1"
  const writtenDateValuePattern = new RegExp(`(${monthPattern})\\s+(\\d{1,2}),?\\s+(\\d{4})[^\\d]*(?:PSA|psa)?[^\\d]*(?:value|Value)?[^\\d]*-?[^\\d]*(\\d+\\.\\d+|\\d+)`, 'gi');
  const writtenMatches = [...fullText.matchAll(writtenDateValuePattern)];
  
  writtenMatches.forEach(match => {
    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    const valueStr = match[4];
    const psaValue = parseFloat(valueStr);
    
    if (!isNaN(psaValue) && psaValue >= 0.1 && psaValue <= 100) {
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex >= 0 && day >= 1 && day <= 31) {
        const month = monthIndex + 1;
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        psaEntries.push({
          testDate: date,
          result: valueStr,
          status: getPSAStatus(psaValue),
          notes: `Extracted from file`
        });
      }
    }
  });
  
  // Also try a simpler pattern: "Month Day, Year" followed by any number on the same line
  // This catches formats like "October 12, 2024: 2.1" or "May 05, 2023: 3.8"
  if (psaEntries.length === 0) {
    const simpleWrittenPattern = new RegExp(`(${monthPattern})\\s+(\\d{1,2}),?\\s+(\\d{4})[^\\d]*[:\\s]*(\\d+\\.\\d+|\\d+)`, 'gi');
    const simpleMatches = [...fullText.matchAll(simpleWrittenPattern)];
    
    simpleMatches.forEach(match => {
      const monthName = match[1].toLowerCase();
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      const valueStr = match[4];
      const psaValue = parseFloat(valueStr);
      
      // Skip if value is clearly a year (4 digits starting with 19 or 20)
      if (valueStr.length === 4 && (valueStr.startsWith('19') || valueStr.startsWith('20'))) {
        return;
      }
      
      if (!isNaN(psaValue) && psaValue >= 0.1 && psaValue <= 100) {
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex >= 0 && day >= 1 && day <= 31) {
          const month = monthIndex + 1;
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          psaEntries.push({
            testDate: date,
            result: valueStr,
            status: getPSAStatus(psaValue),
            notes: `Extracted from file`
          });
        }
      }
    });
  }
  
  // If we didn't find enough structured pairs, try a different approach
  // Look for patterns like: "10/12/2023: 3.4" or "Date: 10/12/2023, PSA: 3.4"
  // Also handle table-like structures where dates and values are in columns
  if (psaEntries.length === 0) {
    // Try to find all date-value pairs in the entire text
    // Pattern: date followed by separator and then a number (with decimal support)
    // More specific: require the number to NOT be part of another date
    // Use word boundaries and exclude numbers that look like dates
    const pairPattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b[:\s,\t|]+(\d+\.\d+|\d+)\b/gi;
    const pairMatches = [...fullText.matchAll(pairPattern)];
    
    pairMatches.forEach(match => {
      const dateStr = match[1];
      const valueStr = match[2];
      const valueIndex = match.index + match[0].indexOf(valueStr);
      const psaValue = parseFloat(valueStr);
      
      // Skip if the value is part of a date
      if (isPartOfDate(fullText, valueIndex, valueStr)) {
        return;
      }
      
      // Only accept reasonable PSA values (0.1 to 100)
      // Prefer decimal values
      if (!isNaN(psaValue) && psaValue >= 0.1 && psaValue <= 100) {
        const date = parseDate(dateStr);
        if (date) {
          // Preserve decimal format - use the matched string directly
          const resultValue = valueStr; // Already includes decimal if present
          
          psaEntries.push({
            testDate: date,
            result: resultValue,
            status: getPSAStatus(psaValue),
            notes: `Extracted from file`
          });
        }
      }
    });
  }
  
  // Additional pass: try to match written dates with nearby PSA values
  // This handles cases like "October 12, 2024" on one line and "PSA value - 2.1" on the next
  if (psaEntries.length < 2) {
    lines.forEach((line, index) => {
      // Check for written dates in this line
      const writtenDateMatch = line.match(new RegExp(`(${monthPattern})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i'));
      
      if (writtenDateMatch) {
        const monthName = writtenDateMatch[1].toLowerCase();
        const day = parseInt(writtenDateMatch[2]);
        const year = parseInt(writtenDateMatch[3]);
        const monthIndex = monthNames.indexOf(monthName);
        
        if (monthIndex >= 0 && day >= 1 && day <= 31) {
          // Look for PSA value in the same line or next line
          const currentAndNextLine = line + ' ' + (lines[index + 1] || '');
          
          // Pattern: "PSA value - X.X" or just a number after the date
          const psaValuePattern = /(?:PSA|psa)?[^0-9]*(?:value|Value)?[^0-9]*-?[^0-9]*(\d+\.\d+|\d+)/i;
          const valueMatch = currentAndNextLine.match(psaValuePattern);
          
          if (valueMatch) {
            const valueStr = valueMatch[1];
            const psaValue = parseFloat(valueStr);
            
            if (!isNaN(psaValue) && psaValue >= 0.1 && psaValue <= 100) {
              const month = monthIndex + 1;
              const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              psaEntries.push({
                testDate: date,
                result: valueStr,
                status: getPSAStatus(psaValue),
                notes: `Extracted from file`
              });
            }
          }
        }
      }
    });
  }
  
  // Additional pass: if we still have few entries, try matching dates and values from adjacent lines
  // This handles cases where dates and values are on separate lines (table format)
  if (psaEntries.length < 2 && lines.length > 1) {
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // Check if current line has dates and next line has values (or vice versa)
      const datesInCurrent = [...currentLine.matchAll(datePattern)];
      const numbersInNext = [];
      const numPattern = /\b(\d+\.\d+|\d+)\b/g;
      let numMatch;
      while ((numMatch = numPattern.exec(nextLine)) !== null) {
        const numValue = parseFloat(numMatch[0]);
        if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 100) {
          numbersInNext.push({ value: numValue, original: numMatch[0] });
        }
      }
      
      // Pair dates from current line with numbers from next line
      if (datesInCurrent.length > 0 && numbersInNext.length > 0) {
        datesInCurrent.forEach((dateMatch, idx) => {
          if (idx < numbersInNext.length) {
            const dateStr = dateMatch[0];
            const numData = numbersInNext[idx];
            const date = parseDate(dateStr);
            
            if (date) {
              psaEntries.push({
                testDate: date,
                result: numData.original,
                status: getPSAStatus(numData.value),
                notes: `Extracted from file`
              });
            }
          }
        });
      }
    }
  }
  
  // Remove duplicates (same date and value)
  const uniqueEntries = [];
  const seen = new Set();
  psaEntries.forEach(entry => {
    const key = `${entry.testDate}-${entry.result}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  });
  
  // Sort by date (oldest first)
  uniqueEntries.sort((a, b) => {
    const dateA = new Date(a.testDate);
    const dateB = new Date(b.testDate);
    return dateA - dateB;
  });
  
  return uniqueEntries;
};

/**
 * Parse date string to YYYY-MM-DD format
 * Supports multiple date formats:
 * - Numeric: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
 * - Written: October 12, 2024, May 05, 2023, etc.
 * - Various separators: /, -, space
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Remove any extra whitespace
  dateStr = dateStr.trim();
  
  // Month names mapping
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  // Try written date formats first (e.g., "October 12, 2024", "May 05, 2023")
  const writtenPattern = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})$/i;
  const writtenMatch = dateStr.match(writtenPattern);
  
  if (writtenMatch) {
    const monthName = writtenMatch[1].toLowerCase();
    const day = parseInt(writtenMatch[2]);
    const year = parseInt(writtenMatch[3]);
    
    // Find month index
    let monthIndex = monthNames.indexOf(monthName);
    if (monthIndex === -1) {
      monthIndex = monthAbbr.indexOf(monthName);
    }
    
    if (monthIndex >= 0 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const month = monthIndex + 1;
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  
  // Try numeric date formats
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,  // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,   // DD/MM/YY or DD-MM-YY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,   // YYYY-MM-DD or YYYY/MM/DD
    /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/,         // DD MM YYYY
    /^(\d{4})\s+(\d{1,2})\s+(\d{1,2})$/,         // YYYY MM DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;
      
      if (match[1].length === 4) {
        // YYYY-MM-DD or YYYY MM DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // DD/MM/YYYY or DD MM YYYY format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
      }
      
      // Validate date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          // Format as YYYY-MM-DD
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
  }
  
  // Try to parse as standard Date object (handles various formats)
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    
    if (year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return null;
};

/**
 * Determine PSA status based on value
 */
const getPSAStatus = (value) => {
  if (value > 4.0) return 'High';
  if (value < 0.0) return 'Low';
  return 'Normal';
};

/**
 * Main function to extract PSA data from file
 */
export const extractPSADataFromFile = async (filePath, fileType) => {
  try {
    let text = '';
    
    // Extract text based on file type
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.pdf'].includes(ext)) {
      text = await extractTextFromPDF(filePath);
    } else if (['.xls', '.xlsx'].includes(ext)) {
      text = await extractTextFromExcel(filePath);
    } else if (['.doc', '.docx'].includes(ext)) {
      text = await extractTextFromWord(filePath);
    } else if (['.csv'].includes(ext)) {
      text = await extractTextFromCSV(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only PDF, Excel (.xls, .xlsx), Word (.doc, .docx), and CSV files are supported.`);
    }
    
    // Parse PSA data from extracted text
    const psaData = parsePSAData(text);
    
    return {
      success: true,
      text: text.substring(0, 1000), // Return first 1000 chars for debugging
      psaEntries: psaData,
      count: psaData.length
    };
  } catch (error) {
    console.error('Error extracting PSA data from file:', error);
    return {
      success: false,
      error: error.message,
      psaEntries: [],
      count: 0
    };
  }
};

