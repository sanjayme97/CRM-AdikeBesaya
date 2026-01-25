# Google Apps Script Setup Guide

This folder contains the Google Apps Script code for atomic ID generation.

## What This Script Does

The script provides **atomic counter increment** functionality to prevent race conditions when multiple users create records simultaneously. It uses Google's `LockService` to ensure that only one user can increment a counter at a time.

### Features:
- ✅ Atomic ID generation (no duplicates, even with concurrent users)
- ✅ Separate counters for Leads, Visits, Quotations, Payments
- ✅ Web App endpoint for React app to call
- ✅ Built-in testing interface (visit Web App URL in browser)
- ✅ Custom menu in Google Sheets for easy testing
- ✅ Initialization function to set up Metadata sheet
- ✅ 100% free (runs on Google's servers)

## Deployment Steps

### Step 1: Create Metadata Sheet

1. Open your Google Sheet (the one you'll use as the database)
2. Create a new sheet tab called **"Metadata"** (exact name, case-sensitive)
3. Don't worry about adding data yet - the script will initialize it

### Step 2: Deploy Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. You'll see a default `Code.gs` file
3. Delete all the default code
4. Copy the entire contents of [`IdGenerator.gs`](./IdGenerator.gs) and paste it
5. Click the **Save** icon (or Ctrl+S)
6. Name the project: **"Fertilizer Tracker ID Generator"**

### Step 3: Initialize Metadata Sheet

1. In the Apps Script editor, select **`initializeMetadata`** from the function dropdown (top bar)
2. Click the **Run** button (▶️ icon)
3. **First time only**: Google will ask you to authorize the script:
   - Click "Review Permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to Fertilizer Tracker ID Generator (unsafe)"
   - Click "Allow"
   - (This is safe - it's your own script running on your own Sheet)
4. Wait for execution to complete (check bottom right for "Execution completed")
5. Go back to your Google Sheet - the **Metadata** sheet should now have:
   ```
   | Key               | Value |
   |-------------------|-------|
   | NextLeadNumber    | 1     |
   | NextVisitNumber   | 1     |
   | NextQuoteNumber   | 1     |
   | NextPaymentNumber | 1     |
   ```

### Step 4: Deploy as Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type" → Choose **Web app**
3. Fill in the form:
   - **Description**: "ID Generator Web App"
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone**
     - ⚠️ This seems open, but it's secure because:
       - Only people with access to the Sheet can use the app
       - The Sheet's sharing settings control access
       - No sensitive data is exposed by this endpoint
4. Click **Deploy**
5. **Copy the Web App URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
   - You'll need this URL in your React app later
   - Save it somewhere safe (e.g., in a `.env` file)

### Step 5: Test the Deployment

1. Open the Web App URL in your browser (paste it in address bar)
2. You should see a nice testing interface with buttons
3. Click **"Generate Lead Number"** button
4. You should see a response like:
   ```json
   {
     "success": true,
     "number": 1,
     "entityType": "Lead"
   }
   ```
5. Go back to your Google Sheet → Metadata tab
6. Verify that `NextLeadNumber` is now **2** (it incremented!)

### Step 6: Test from Google Sheets Menu (Optional)

1. Close and reopen your Google Sheet (to trigger `onOpen()` function)
2. You should see a new menu: **"🌾 Fertilizer Tracker"**
3. Click it → **"Test: Generate Lead Number"**
4. You should see a popup with the generated number
5. Try clicking it multiple times - each time you get a unique number

## Using in React App

Once deployed, update your React app to use this endpoint:

1. Create a `.env` file in your React project root:
   ```env
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

2. Update `src/utils/idGeneration.ts`:
   ```typescript
   export async function getNextRowNumber(entityType: EntityType): Promise<number> {
     const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         action: 'getNextNumber',
         entityType: entityType,
       }),
     });

     const data = await response.json();

     if (!data.success) {
       throw new Error(data.error || 'Failed to generate ID');
     }

     return data.number;
   }
   ```

## Troubleshooting

### Error: "Metadata sheet not found"
- Make sure you created a sheet named **"Metadata"** (exact spelling, case-sensitive)
- Run the `initializeMetadata()` function

### Error: "Could not acquire lock after 30 seconds"
- This means many users tried to generate IDs at the exact same time
- Very rare - just retry the operation
- The 30-second timeout is very generous

### Error: "Script has not been deployed"
- Make sure you clicked **Deploy → New deployment**
- Make sure you chose **Web app** as the deployment type

### IDs are skipping numbers (e.g., 1, 2, 5, 8)
- **This is normal and expected!** Small gaps happen when:
  - User gets a number but doesn't save the form (cancels or navigates away)
  - Network error occurs after getting number but before saving
- This is acceptable in production systems (even your bank account numbers have gaps!)

### Want to reset counters back to 1?
- Open Metadata sheet
- Manually change the Value column to 1 (or any number you want)
- Next generated ID will start from that number

## Custom Menu Items

After opening the sheet, you'll see a custom menu **"🌾 Fertilizer Tracker"** with:

- **Initialize Metadata Sheet**: Sets up or resets the Metadata sheet
- **Test: Generate Lead Number**: Generates a test lead number (shows popup)
- **Test: Generate Visit Number**: Generates a test visit number (shows popup)
- **View Current Counters**: Shows current values of all counters (for debugging)

## Security Notes

### Is "Anyone" access secure?
Yes! Here's why:
- The Apps Script only generates sequential numbers (no sensitive data)
- To actually **use** those numbers, users need access to the Sheet
- Sheet-level permissions (Google Drive sharing) control who can write data
- Without Sheet access, a generated number is useless

### Can someone exhaust the counters?
- Technically yes, but unlikely:
- Would need to call the endpoint millions of times
- Google Apps Script has quotas (20,000 calls/day for free accounts)
- If concerned, change "Who has access" to "Anyone with Google account"

### Can someone see existing data?
- No! The Apps Script only reads/writes the Metadata sheet
- It has no access to Leads, Visits, Quotations, or Payments data
- Those sheets are only accessible via Google Sheets API (with OAuth)

## Files in This Folder

- **`IdGenerator.gs`**: The main Apps Script code (copy this to Apps Script editor)
- **`README.md`**: This documentation file
- **`appsscript.json`** (optional): Apps Script manifest (not required for basic deployment)

## Support

If you encounter issues:
1. Check the Apps Script execution logs (View → Execution log)
2. Check the Metadata sheet has the correct structure
3. Verify the Web App deployment settings
4. Test using the browser interface (visit Web App URL)

---

**Next Steps**: Once this is deployed and tested, integrate it with your React app by updating the `getNextRowNumber()` function in `src/utils/idGeneration.ts`.
