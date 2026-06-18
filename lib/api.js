import { google } from 'googleapis';
import { readConfig } from './config.js';

/**
 * Creates an authorized Google Sheets client.
 * @param {object} [config] Optional configuration. If omitted, it reads from config.json.
 */
function getSheetsClient(config) {
  const activeConfig = config || readConfig();
  
  if (!activeConfig.credentials) {
    throw new Error('fatal: Google API credentials not configured.\nUse: spreadjam config --credentials <path-to-service-account-json>');
  }
  if (!activeConfig.spreadsheetId) {
    throw new Error('fatal: Spreadsheet ID not configured.\nUse: spreadjam config --spreadsheet <spreadsheet-id>');
  }

  let creds = activeConfig.credentials;
  if (typeof creds === 'string') {
    try {
      creds = JSON.parse(creds);
    } catch (err) {
      throw new Error(`fatal: credentials are not valid JSON: ${err.message}`);
    }
  }

  try {
    const auth = new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    throw new Error(`fatal: failed to initialize Google auth client: ${err.message}`);
  }
}

/**
 * Utility to convert 0-based column index to A1 column letters (e.g. 0 -> A, 27 -> AB).
 */
export function indexToColumnLetter(index) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Resolves sheet properties (title and sheetId) given an optional sheet name.
 * If sheetName is not provided, defaults to the first sheet.
 */
async function resolveSheet(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetsList = meta.data.sheets || [];
  if (sheetsList.length === 0) {
    throw new Error('fatal: The spreadsheet has no sheets (tabs).');
  }

  if (!sheetName) {
    const firstSheet = sheetsList[0].properties;
    return {
      sheetId: firstSheet.sheetId,
      title: firstSheet.title
    };
  }

  const found = sheetsList.find(
    s => s.properties.title.toLowerCase() === sheetName.toLowerCase() || s.properties.title === sheetName
  );
  if (!found) {
    throw new Error(`fatal: Sheet "${sheetName}" not found in this spreadsheet.`);
  }

  return {
    sheetId: found.properties.sheetId,
    title: found.properties.title
  };
}

/**
 * Verifies connection by fetching spreadsheet metadata.
 */
export async function verifyConnection() {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId
    });
    return {
      title: res.data.properties.title,
      sheets: (res.data.sheets || []).map(s => s.properties.title)
    };
  } catch (err) {
    throw new Error(`fatal: Connection verification failed: ${err.message}`);
  }
}

/**
 * Lists the column headers from the first row of the sheet.
 */
export async function listColumns(sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetInfo.title}!1:1`
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    return { title: sheetInfo.title, columns: [] };
  }
  return { title: sheetInfo.title, columns: rows[0] };
}

/**
 * Adds a new column to the sheet.
 */
export async function addColumn(columnName, sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  // Get current headers
  const { columns } = await listColumns(sheetInfo.title);
  
  if (columns.includes(columnName)) {
    throw new Error(`fatal: Column "${columnName}" already exists in sheet "${sheetInfo.title}".`);
  }

  const nextColIndex = columns.length;
  const colLetter = indexToColumnLetter(nextColIndex);
  const range = `${sheetInfo.title}!${colLetter}1`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[columnName]]
    }
  });

  return { title: sheetInfo.title, columnName, letter: colLetter };
}

/**
 * Deletes a column matching the columnName.
 */
export async function deleteColumn(columnName, sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  // Get current headers
  const { columns } = await listColumns(sheetInfo.title);
  
  const colIndex = columns.indexOf(columnName);
  if (colIndex === -1) {
    throw new Error(`fatal: Column "${columnName}" not found in sheet "${sheetInfo.title}".`);
  }

  // Delete column dimension using batchUpdate
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetInfo.sheetId,
              dimension: 'COLUMNS',
              startIndex: colIndex,
              endIndex: colIndex + 1
            }
          }
        }
      ]
    }
  });

  return { title: sheetInfo.title, columnName, index: colIndex };
}

/**
 * Lists rows of the sheet.
 */
export async function listRows(sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetInfo.title}!A1:ZZ1000` // Large enough block
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    return { title: sheetInfo.title, headers: [], records: [] };
  }

  const headers = rows[0];
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] !== undefined ? row[index] : '';
    });
    records.push(record);
  }

  return { title: sheetInfo.title, headers, records };
}

/**
 * Adds a new row of data.
 * @param {Array|object} data If Array, values written sequentially. If object, mapped to headers.
 * @param {string} sheetName 
 * @param {object} [options] Optional parameters like autodate and autotime.
 */
export async function addRow(data, sheetName, options = {}) {
  const { autodate, autotime } = options;
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  // Get current columns
  let { columns } = await listColumns(sheetInfo.title);

  // Check and add date column if needed
  const hasDate = columns.some(c => c.toLowerCase() === 'date');
  if (autodate && !hasDate) {
    await addColumn('date', sheetInfo.title);
    // Refresh columns
    const refreshed = await listColumns(sheetInfo.title);
    columns = refreshed.columns;
  }

  // Check and add time column if needed
  const hasTime = columns.some(c => c.toLowerCase() === 'time');
  if (autotime && !hasTime) {
    await addColumn('time', sheetInfo.title);
    // Refresh columns
    const refreshed = await listColumns(sheetInfo.title);
    columns = refreshed.columns;
  }

  // Generate date/time strings in DD-MM-YYYY and HH:MM:SS formats
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const hh = String(today.getHours()).padStart(2, '0');
  const min = String(today.getMinutes()).padStart(2, '0');
  const ss = String(today.getSeconds()).padStart(2, '0');
  const timeStr = `${hh}:${min}:${ss}`;

  let valuesToWrite = [];

  if (Array.isArray(data)) {
    // Determine which columns are automatic
    const nonAutoCols = columns.filter(col => {
      const colLower = col.toLowerCase();
      const isAutoD = autodate && colLower === 'date';
      const isAutoT = autotime && colLower === 'time';
      return !isAutoD && !isAutoT;
    });

    let dataIndex = 0;
    valuesToWrite = columns.map(col => {
      const colLower = col.toLowerCase();
      if (autodate && colLower === 'date') {
        return dateStr;
      }
      if (autotime && colLower === 'time') {
        return timeStr;
      }
      // Map to the next positional value
      const val = data[dataIndex] !== undefined ? data[dataIndex] : '';
      dataIndex++;
      return val;
    });
  } else {
    // It's an object of key-value pairs
    // Map keys to columns, and fill in autodate/autotime
    valuesToWrite = columns.map(col => {
      const colLower = col.toLowerCase();
      if (autodate && colLower === 'date') {
        return data[col] !== undefined ? data[col] : dateStr;
      }
      if (autotime && colLower === 'time') {
        return data[col] !== undefined ? data[col] : timeStr;
      }
      return data[col] !== undefined ? data[col] : '';
    });

    // Check if the user specified keys that don't exist as columns
    const extraKeys = Object.keys(data).filter(k => !columns.includes(k));
    if (extraKeys.length > 0) {
      throw new Error(`fatal: Columns do not exist: ${extraKeys.join(', ')}.\nUse \`spreadjam col add <name>\` first.`);
    }
  }

  // Append values
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetInfo.title}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [valuesToWrite]
    }
  });

  return { title: sheetInfo.title, values: valuesToWrite };
}

/**
 * Deletes a row by index (1-based index where 1 is the first data row / index 1 in Google Sheets).
 */
export async function deleteRow(rowIndex, sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetInfo.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    }
  });

  return { title: sheetInfo.title, rowIndex };
}

/**
 * Adds a new sheet (tab) to the spreadsheet.
 */
export async function addSheet(sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }
      ]
    }
  });

  return { title: sheetName };
}

/**
 * Deletes a sheet (tab) from the spreadsheet.
 */
export async function deleteSheet(sheetName) {
  const config = readConfig();
  const sheets = getSheetsClient(config);
  
  // Resolve the sheetId first since deleteSheet requires the sheetId, not the title.
  const sheetInfo = await resolveSheet(sheets, config.spreadsheetId, sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    resource: {
      requests: [
        {
          deleteSheet: {
            sheetId: sheetInfo.sheetId
          }
        }
      ]
    }
  });

  return { title: sheetInfo.title };
}
