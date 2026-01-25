/**
 * Google Apps Script for Atomic ID Generation
 *
 * This script provides atomic counter increment functionality to prevent race conditions
 * when multiple users create records simultaneously.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing Code.gs content
 * 4. Copy-paste this entire file
 * 5. Save the project (name it "Fertilizer Tracker ID Generator")
 * 6. Deploy as Web App:
 *    - Click Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone (this is secure because Sheet permissions control access)
 *    - Click Deploy
 *    - Copy the Web App URL (you'll need this in React app)
 *
 * METADATA SHEET STRUCTURE:
 * Create a sheet named "Metadata" with columns:
 * | Key               | Value |
 * |-------------------|-------|
 * | NextLeadNumber    | 1     |
 * | NextVisitNumber   | 1     |
 * | NextQuoteNumber   | 1     |
 * | NextPaymentNumber | 1     |
 */

/**
 * Gets the next available Lead number (atomic operation)
 * Uses LockService to prevent race conditions
 *
 * @returns {number} The next available lead number
 */
function getNextLeadNumber() {
  return getNextNumber('NextLeadNumber');
}

/**
 * Gets the next available Field Visit number (atomic operation)
 *
 * @returns {number} The next available visit number
 */
function getNextVisitNumber() {
  return getNextNumber('NextVisitNumber');
}

/**
 * Gets the next available Quotation number (atomic operation)
 *
 * @returns {number} The next available quote number
 */
function getNextQuoteNumber() {
  return getNextNumber('NextQuoteNumber');
}

/**
 * Gets the next available Payment number (atomic operation)
 *
 * @returns {number} The next available payment number
 */
function getNextPaymentNumber() {
  return getNextNumber('NextPaymentNumber');
}

/**
 * Generic function to get next number for any entity type
 * Uses LockService to ensure atomic increment (prevents race conditions)
 *
 * @param {string} key - The metadata key (e.g., 'NextLeadNumber')
 * @returns {number} The next available number
 * @throws {Error} If lock cannot be acquired or key not found
 */
function getNextNumber(key) {
  // Acquire lock to prevent concurrent access
  const lock = LockService.getScriptLock();
  const lockAcquired = lock.tryLock(30000); // Wait up to 30 seconds for lock

  if (!lockAcquired) {
    throw new Error('Could not acquire lock after 30 seconds. Please try again.');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const metadataSheet = ss.getSheetByName('Metadata');

    if (!metadataSheet) {
      throw new Error('Metadata sheet not found. Please create it with Key and Value columns.');
    }

    // Get all data from Metadata sheet (Key in column A, Value in column B)
    const data = metadataSheet.getRange('A:B').getValues();

    // Find the row with our key
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        const currentNumber = parseInt(data[i][1]);

        if (isNaN(currentNumber)) {
          throw new Error(`Invalid number format for ${key}: ${data[i][1]}`);
        }

        // Increment the counter in the sheet (reserve this number)
        const rowIndex = i + 1; // Sheets are 1-indexed
        metadataSheet.getRange(rowIndex, 2).setValue(currentNumber + 1);

        // Log the operation for debugging
        Logger.log(`Generated ${key}: ${currentNumber}`);

        // Return the reserved number
        return currentNumber;
      }
    }

    // If we reach here, the key was not found
    throw new Error(`Key '${key}' not found in Metadata sheet. Please add it.`);

  } finally {
    // Always release the lock, even if an error occurred
    lock.releaseLock();
  }
}

/**
 * Web App endpoint - handles POST requests from React app
 *
 * Expected request body (JSON):
 * {
 *   "action": "getNextNumber",
 *   "entityType": "Lead" | "FieldVisit" | "Quotation" | "Payment"
 * }
 *
 * Response (JSON):
 * {
 *   "success": true,
 *   "number": 416,
 *   "entityType": "Lead"
 * }
 *
 * Or on error:
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 */
function doPost(e) {
  try {
    // Parse request body
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const entityType = requestData.entityType;

    Logger.log(`Received request: action=${action}, entityType=${entityType}`);

    if (action !== 'getNextNumber') {
      throw new Error(`Unknown action: ${action}`);
    }

    if (!entityType) {
      throw new Error('entityType is required');
    }

    // Get the next number based on entity type
    let number;
    switch (entityType) {
      case 'Lead':
        number = getNextLeadNumber();
        break;
      case 'FieldVisit':
        number = getNextVisitNumber();
        break;
      case 'Quotation':
        number = getNextQuoteNumber();
        break;
      case 'Payment':
        number = getNextPaymentNumber();
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        number: number,
        entityType: entityType
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error: ${error.message}`);

    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web App endpoint - handles GET requests (for testing)
 * Visit the Web App URL in browser to test
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fertilizer Tracker ID Generator</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
          }
          h1 { color: #2e7d32; }
          .info {
            background: rgb(232, 245, 233);
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          button {
            background: #4caf50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
          }
          button:hover { background: #45a049; }
          pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>🌾 Fertilizer Tracker ID Generator</h1>
        <div class="info">
          <p><strong>Status:</strong> ✅ Web App is running!</p>
          <p><strong>Purpose:</strong> Generates atomic sequential IDs for Leads, Visits, Quotes, and Payments</p>
        </div>

        <h2>Test ID Generation</h2>
        <button onclick="testGenerate('Lead')">Generate Lead Number</button>
        <button onclick="testGenerate('FieldVisit')">Generate Visit Number</button>
        <button onclick="testGenerate('Quotation')">Generate Quote Number</button>
        <button onclick="testGenerate('Payment')">Generate Payment Number</button>

        <h3>Response:</h3>
        <pre id="response">Click a button to test ID generation...</pre>

        <h2>API Documentation</h2>
        <p><strong>Endpoint:</strong> POST to this URL</p>
        <p><strong>Request Body:</strong></p>
        <pre>{
  "action": "getNextNumber",
  "entityType": "Lead" | "FieldVisit" | "Quotation" | "Payment"
}</pre>
        <p><strong>Response:</strong></p>
        <pre>{
  "success": true,
  "number": 416,
  "entityType": "Lead"
}</pre>

        <script>
          async function testGenerate(entityType) {
            const responseEl = document.getElementById('response');
            responseEl.textContent = 'Loading...';

            try {
              const response = await fetch(window.location.href, {
                method: 'POST',
                body: JSON.stringify({
                  action: 'getNextNumber',
                  entityType: entityType
                })
              });

              const data = await response.json();
              responseEl.textContent = JSON.stringify(data, null, 2);

              if (data.success) {
                responseEl.style.color = '#2e7d32';
              } else {
                responseEl.style.color = '#c62828';
              }
            } catch (error) {
              responseEl.textContent = 'Error: ' + error.message;
              responseEl.style.color = '#c62828';
            }
          }
        </script>
      </body>
    </html>
  `);
}

/**
 * Utility function to initialize Metadata sheet with default values
 * Run this once after creating the Metadata sheet
 *
 * HOW TO RUN:
 * 1. In Apps Script editor, select this function from dropdown
 * 2. Click Run button
 * 3. Authorize the script when prompted
 */
function initializeMetadata() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let metadataSheet = ss.getSheetByName('Metadata');

  // Create Metadata sheet if it doesn't exist
  if (!metadataSheet) {
    metadataSheet = ss.insertSheet('Metadata');
  }

  // Clear existing data
  metadataSheet.clear();

  // Set up headers
  metadataSheet.getRange('A1:B1').setValues([['Key', 'Value']]);
  metadataSheet.getRange('A1:B1').setFontWeight('bold');

  // Initialize counters (start from 1)
  const initialData = [
    ['NextLeadNumber', 1],
    ['NextVisitNumber', 1],
    ['NextQuoteNumber', 1],
    ['NextPaymentNumber', 1]
  ];

  metadataSheet.getRange(2, 1, initialData.length, 2).setValues(initialData);

  // Format as table
  metadataSheet.autoResizeColumns(1, 2);

  Logger.log('Metadata sheet initialized successfully!');
  SpreadsheetApp.getUi().alert(
    'Success!',
    'Metadata sheet has been initialized with counters starting at 1.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Creates a custom menu in Google Sheets for easy access
 * Runs automatically when the spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌾 Fertilizer Tracker')
    .addItem('🔧 Initialize All Sheets', 'initializeAllSheets')
    .addItem('Initialize Metadata Only', 'initializeMetadata')
    .addSeparator()
    .addItem('Test: Generate Lead Number', 'testLeadNumber')
    .addItem('Test: Generate Visit Number', 'testVisitNumber')
    .addSeparator()
    .addItem('View Current Counters', 'showCurrentCounters')
    .addToUi();
}

/**
 * Test function to generate a lead number (for manual testing)
 */
function testLeadNumber() {
  try {
    const number = getNextLeadNumber();
    SpreadsheetApp.getUi().alert(
      'Success!',
      `Generated Lead Number: ${number}\nDisplay ID will be: LEA-${String(number).padStart(4, '0')}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Test function to generate a visit number (for manual testing)
 */
function testVisitNumber() {
  try {
    const number = getNextVisitNumber();
    SpreadsheetApp.getUi().alert(
      'Success!',
      `Generated Visit Number: ${number}\nDisplay ID will be: VIS-${String(number).padStart(4, '0')}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Shows current counter values (for debugging)
 */
function showCurrentCounters() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const metadataSheet = ss.getSheetByName('Metadata');

    if (!metadataSheet) {
      throw new Error('Metadata sheet not found');
    }

    const data = metadataSheet.getRange('A:B').getValues();
    let message = 'Current Counter Values:\n\n';

    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
      if (data[i][0]) {
        message += `${data[i][0]}: ${data[i][1]}\n`;
      }
    }

    SpreadsheetApp.getUi().alert(
      'Current Counters',
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
