/**
 * Sheet Structure Initializer
 *
 * Creates all required sheets with proper structure
 * Run this ONCE after creating your Google Sheet
 */

/**
 * Main initialization function
 * Creates all sheets with headers and sample data
 */
function initializeAllSheets() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    'Initialize Sheet Structure',
    'This will create all required sheets (Metadata, Roles, Lookups, Leads, etc.) with proper headers and sample data.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  try {
    createMetadataSheet();
    createRolesSheet();
    createLookupsSheet();
    createLeadsSheet();
    createFieldVisitsSheet();
    createQuotationsSheet();
    createPaymentsSheet();

    ui.alert(
      'Success!',
      'All sheets created successfully!\n\n' +
      'Next steps:\n' +
      '1. Add your team members to Roles sheet\n' +
      '2. Customize Lookups values if needed\n' +
      '3. Deploy this script as Web App',
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('Error', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Creates Metadata sheet with ID counters
 */
function createMetadataSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Metadata');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Metadata');
  }

  // Headers
  sheet.getRange('A1:B1').setValues([['Key', 'Value']]);
  sheet.getRange('A1:B1').setFontWeight('bold');

  // Counters
  const data = [
    ['NextLeadNumber', 1],
    ['NextVisitNumber', 1],
    ['NextQuoteNumber', 1],
    ['NextPaymentNumber', 1]
  ];
  sheet.getRange(2, 1, data.length, 2).setValues(data);

  sheet.autoResizeColumns(1, 2);
}

/**
 * Creates Roles sheet
 */
function createRolesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Roles');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Roles');
  }

  // Headers
  sheet.getRange('A1:B1').setValues([['Email', 'Role']]);
  sheet.getRange('A1:B1').setFontWeight('bold');

  // Sample data (replace with your emails)
  const currentUser = Session.getActiveUser().getEmail();
  const data = [
    [currentUser, 'Manager']
  ];
  sheet.getRange(2, 1, data.length, 2).setValues(data);

  sheet.autoResizeColumns(1, 2);
}

/**
 * Creates Lookups sheet with dropdown values
 * Column E (ParentValue) is used for hierarchical lookups like Taluk -> District
 */
function createLookupsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Lookups');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Lookups');
  }

  // Headers - Added ParentValue column for hierarchical lookups
  sheet.getRange('A1:E1').setValues([['Category', 'Value', 'DisplayOrder', 'Active', 'ParentValue']]);
  sheet.getRange('A1:E1').setFontWeight('bold');

  // Karnataka Districts and Taluks data
  const data = [
    // =============================================
    // KARNATAKA DISTRICTS (31 districts)
    // =============================================

    // Bengaluru Division
    ['District', 'Bengaluru Rural', 1, true, ''],
    ['District', 'Bengaluru Urban', 2, true, ''],
    ['District', 'Chikkaballapura', 3, true, ''],
    ['District', 'Chitradurga', 4, true, ''],
    ['District', 'Davanagere', 5, true, ''],
    ['District', 'Kolar', 6, true, ''],
    ['District', 'Ramanagara', 7, true, ''],
    ['District', 'Shivamogga', 8, true, ''],
    ['District', 'Tumakuru', 9, true, ''],
    ['District', 'Vijayanagara', 10, true, ''],

    // Belagavi Division
    ['District', 'Bagalkote', 11, true, ''],
    ['District', 'Belagavi', 12, true, ''],
    ['District', 'Dharwad', 13, true, ''],
    ['District', 'Gadag', 14, true, ''],
    ['District', 'Haveri', 15, true, ''],
    ['District', 'Vijayapura', 16, true, ''],

    // Mysuru Division
    ['District', 'Chamarajanagar', 17, true, ''],
    ['District', 'Chikkamagaluru', 18, true, ''],
    ['District', 'Hassan', 19, true, ''],
    ['District', 'Kodagu', 20, true, ''],
    ['District', 'Mandya', 21, true, ''],
    ['District', 'Mysuru', 22, true, ''],
    ['District', 'Udupi', 23, true, ''],

    // Kalaburagi Division
    ['District', 'Ballari', 24, true, ''],
    ['District', 'Bidar', 25, true, ''],
    ['District', 'Kalaburagi', 26, true, ''],
    ['District', 'Koppal', 27, true, ''],
    ['District', 'Raichur', 28, true, ''],
    ['District', 'Yadgir', 29, true, ''],

    // Additional
    ['District', 'Dakshina Kannada', 30, true, ''],
    ['District', 'Uttara Kannada', 31, true, ''],

    // =============================================
    // TALUKS BY DISTRICT (ParentValue = District name)
    // =============================================

    // Bengaluru Rural Taluks
    ['Taluk', 'Devanahalli', 1, true, 'Bengaluru Rural'],
    ['Taluk', 'Doddaballapur', 2, true, 'Bengaluru Rural'],
    ['Taluk', 'Hoskote', 3, true, 'Bengaluru Rural'],
    ['Taluk', 'Nelamangala', 4, true, 'Bengaluru Rural'],

    // Bengaluru Urban Taluks
    ['Taluk', 'Anekal', 1, true, 'Bengaluru Urban'],
    ['Taluk', 'Bangalore East', 2, true, 'Bengaluru Urban'],
    ['Taluk', 'Bangalore North', 3, true, 'Bengaluru Urban'],
    ['Taluk', 'Bangalore South', 4, true, 'Bengaluru Urban'],
    ['Taluk', 'Yelahanka', 5, true, 'Bengaluru Urban'],

    // Chikkaballapura Taluks
    ['Taluk', 'Bagepalli', 1, true, 'Chikkaballapura'],
    ['Taluk', 'Chikkaballapura', 2, true, 'Chikkaballapura'],
    ['Taluk', 'Chintamani', 3, true, 'Chikkaballapura'],
    ['Taluk', 'Gowribidanur', 4, true, 'Chikkaballapura'],
    ['Taluk', 'Gudibanda', 5, true, 'Chikkaballapura'],
    ['Taluk', 'Sidlaghatta', 6, true, 'Chikkaballapura'],

    // Chitradurga Taluks
    ['Taluk', 'Challakere', 1, true, 'Chitradurga'],
    ['Taluk', 'Chitradurga', 2, true, 'Chitradurga'],
    ['Taluk', 'Hiriyur', 3, true, 'Chitradurga'],
    ['Taluk', 'Holalkere', 4, true, 'Chitradurga'],
    ['Taluk', 'Hosadurga', 5, true, 'Chitradurga'],
    ['Taluk', 'Molakalmuru', 6, true, 'Chitradurga'],

    // Davanagere Taluks
    ['Taluk', 'Channagiri', 1, true, 'Davanagere'],
    ['Taluk', 'Davanagere', 2, true, 'Davanagere'],
    ['Taluk', 'Harihar', 3, true, 'Davanagere'],
    ['Taluk', 'Honnali', 4, true, 'Davanagere'],
    ['Taluk', 'Jagalur', 5, true, 'Davanagere'],
    ['Taluk', 'Nyamathi', 6, true, 'Davanagere'],

    // Kolar Taluks
    ['Taluk', 'Bangarapet', 1, true, 'Kolar'],
    ['Taluk', 'Kolar', 2, true, 'Kolar'],
    ['Taluk', 'Malur', 3, true, 'Kolar'],
    ['Taluk', 'Mulbagal', 4, true, 'Kolar'],
    ['Taluk', 'Srinivaspur', 5, true, 'Kolar'],
    ['Taluk', 'KGF', 6, true, 'Kolar'],

    // Ramanagara Taluks
    ['Taluk', 'Channapatna', 1, true, 'Ramanagara'],
    ['Taluk', 'Kanakapura', 2, true, 'Ramanagara'],
    ['Taluk', 'Magadi', 3, true, 'Ramanagara'],
    ['Taluk', 'Ramanagara', 4, true, 'Ramanagara'],

    // Shivamogga Taluks
    ['Taluk', 'Bhadravati', 1, true, 'Shivamogga'],
    ['Taluk', 'Hosanagara', 2, true, 'Shivamogga'],
    ['Taluk', 'Sagar', 3, true, 'Shivamogga'],
    ['Taluk', 'Shikarpur', 4, true, 'Shivamogga'],
    ['Taluk', 'Shivamogga', 5, true, 'Shivamogga'],
    ['Taluk', 'Sorab', 6, true, 'Shivamogga'],
    ['Taluk', 'Thirthahalli', 7, true, 'Shivamogga'],

    // Tumakuru Taluks
    ['Taluk', 'Chikkanayakanahalli', 1, true, 'Tumakuru'],
    ['Taluk', 'Gubbi', 2, true, 'Tumakuru'],
    ['Taluk', 'Koratagere', 3, true, 'Tumakuru'],
    ['Taluk', 'Kunigal', 4, true, 'Tumakuru'],
    ['Taluk', 'Madhugiri', 5, true, 'Tumakuru'],
    ['Taluk', 'Pavagada', 6, true, 'Tumakuru'],
    ['Taluk', 'Sira', 7, true, 'Tumakuru'],
    ['Taluk', 'Tiptur', 8, true, 'Tumakuru'],
    ['Taluk', 'Tumakuru', 9, true, 'Tumakuru'],
    ['Taluk', 'Turuvekere', 10, true, 'Tumakuru'],

    // Vijayanagara Taluks
    ['Taluk', 'Hagaribommanahalli', 1, true, 'Vijayanagara'],
    ['Taluk', 'Harapanahalli', 2, true, 'Vijayanagara'],
    ['Taluk', 'Hospet', 3, true, 'Vijayanagara'],
    ['Taluk', 'Kudligi', 4, true, 'Vijayanagara'],

    // Bagalkote Taluks
    ['Taluk', 'Bagalkote', 1, true, 'Bagalkote'],
    ['Taluk', 'Badami', 2, true, 'Bagalkote'],
    ['Taluk', 'Bilgi', 3, true, 'Bagalkote'],
    ['Taluk', 'Hungund', 4, true, 'Bagalkote'],
    ['Taluk', 'Jamakhandi', 5, true, 'Bagalkote'],
    ['Taluk', 'Mudhol', 6, true, 'Bagalkote'],
    ['Taluk', 'Rabkavi Banhatti', 7, true, 'Bagalkote'],

    // Belagavi Taluks
    ['Taluk', 'Athani', 1, true, 'Belagavi'],
    ['Taluk', 'Bailahongal', 2, true, 'Belagavi'],
    ['Taluk', 'Belagavi', 3, true, 'Belagavi'],
    ['Taluk', 'Chikkodi', 4, true, 'Belagavi'],
    ['Taluk', 'Gokak', 5, true, 'Belagavi'],
    ['Taluk', 'Khanapur', 6, true, 'Belagavi'],
    ['Taluk', 'Kittur', 7, true, 'Belagavi'],
    ['Taluk', 'Mudalgi', 8, true, 'Belagavi'],
    ['Taluk', 'Nipani', 9, true, 'Belagavi'],
    ['Taluk', 'Ramdurg', 10, true, 'Belagavi'],
    ['Taluk', 'Saundatti', 11, true, 'Belagavi'],

    // Dharwad Taluks
    ['Taluk', 'Dharwad', 1, true, 'Dharwad'],
    ['Taluk', 'Hubli', 2, true, 'Dharwad'],
    ['Taluk', 'Kalghatgi', 3, true, 'Dharwad'],
    ['Taluk', 'Kundgol', 4, true, 'Dharwad'],
    ['Taluk', 'Navalgund', 5, true, 'Dharwad'],

    // Gadag Taluks
    ['Taluk', 'Gadag', 1, true, 'Gadag'],
    ['Taluk', 'Nargund', 2, true, 'Gadag'],
    ['Taluk', 'Ron', 3, true, 'Gadag'],
    ['Taluk', 'Shirhatti', 4, true, 'Gadag'],
    ['Taluk', 'Lakshmeshwar', 5, true, 'Gadag'],

    // Haveri Taluks
    ['Taluk', 'Byadgi', 1, true, 'Haveri'],
    ['Taluk', 'Haveri', 2, true, 'Haveri'],
    ['Taluk', 'Hirekerur', 3, true, 'Haveri'],
    ['Taluk', 'Hanagal', 4, true, 'Haveri'],
    ['Taluk', 'Ranebennur', 5, true, 'Haveri'],
    ['Taluk', 'Savanur', 6, true, 'Haveri'],

    // Vijayapura Taluks
    ['Taluk', 'Vijayapura', 1, true, 'Vijayapura'],
    ['Taluk', 'Basavan Bagevadi', 2, true, 'Vijayapura'],
    ['Taluk', 'Muddebihal', 3, true, 'Vijayapura'],
    ['Taluk', 'Sindgi', 4, true, 'Vijayapura'],
    ['Taluk', 'Indi', 5, true, 'Vijayapura'],

    // Chamarajanagar Taluks
    ['Taluk', 'Chamarajanagar', 1, true, 'Chamarajanagar'],
    ['Taluk', 'Gundlupet', 2, true, 'Chamarajanagar'],
    ['Taluk', 'Kollegal', 3, true, 'Chamarajanagar'],
    ['Taluk', 'Yelandur', 4, true, 'Chamarajanagar'],

    // Chikkamagaluru Taluks
    ['Taluk', 'Chikkamagaluru', 1, true, 'Chikkamagaluru'],
    ['Taluk', 'Kadur', 2, true, 'Chikkamagaluru'],
    ['Taluk', 'Koppa', 3, true, 'Chikkamagaluru'],
    ['Taluk', 'Mudigere', 4, true, 'Chikkamagaluru'],
    ['Taluk', 'Narasimharajapura', 5, true, 'Chikkamagaluru'],
    ['Taluk', 'Sringeri', 6, true, 'Chikkamagaluru'],
    ['Taluk', 'Tarikere', 7, true, 'Chikkamagaluru'],

    // Hassan Taluks
    ['Taluk', 'Arsikere', 1, true, 'Hassan'],
    ['Taluk', 'Belur', 2, true, 'Hassan'],
    ['Taluk', 'Channarayapatna', 3, true, 'Hassan'],
    ['Taluk', 'Hassan', 4, true, 'Hassan'],
    ['Taluk', 'Holenarasipura', 5, true, 'Hassan'],
    ['Taluk', 'Sakleshpura', 6, true, 'Hassan'],
    ['Taluk', 'Arkalgud', 7, true, 'Hassan'],
    ['Taluk', 'Alur', 8, true, 'Hassan'],

    // Kodagu Taluks
    ['Taluk', 'Madikeri', 1, true, 'Kodagu'],
    ['Taluk', 'Somvarpet', 2, true, 'Kodagu'],
    ['Taluk', 'Virajpet', 3, true, 'Kodagu'],

    // Mandya Taluks
    ['Taluk', 'Krishnarajpet', 1, true, 'Mandya'],
    ['Taluk', 'Maddur', 2, true, 'Mandya'],
    ['Taluk', 'Malavalli', 3, true, 'Mandya'],
    ['Taluk', 'Mandya', 4, true, 'Mandya'],
    ['Taluk', 'Nagamangala', 5, true, 'Mandya'],
    ['Taluk', 'Pandavapura', 6, true, 'Mandya'],
    ['Taluk', 'Srirangapatna', 7, true, 'Mandya'],

    // Mysuru Taluks
    ['Taluk', 'Hunsur', 1, true, 'Mysuru'],
    ['Taluk', 'H.D. Kote', 2, true, 'Mysuru'],
    ['Taluk', 'Krishnarajanagara', 3, true, 'Mysuru'],
    ['Taluk', 'Mysuru', 4, true, 'Mysuru'],
    ['Taluk', 'Nanjangud', 5, true, 'Mysuru'],
    ['Taluk', 'Periyapatna', 6, true, 'Mysuru'],
    ['Taluk', 'T. Narasipura', 7, true, 'Mysuru'],

    // Udupi Taluks
    ['Taluk', 'Brahmavar', 1, true, 'Udupi'],
    ['Taluk', 'Byndoor', 2, true, 'Udupi'],
    ['Taluk', 'Karkala', 3, true, 'Udupi'],
    ['Taluk', 'Kundapura', 4, true, 'Udupi'],
    ['Taluk', 'Udupi', 5, true, 'Udupi'],

    // Ballari Taluks
    ['Taluk', 'Ballari', 1, true, 'Ballari'],
    ['Taluk', 'Hadagali', 2, true, 'Ballari'],
    ['Taluk', 'Kampli', 3, true, 'Ballari'],
    ['Taluk', 'Kurugodu', 4, true, 'Ballari'],
    ['Taluk', 'Sanduru', 5, true, 'Ballari'],
    ['Taluk', 'Siruguppa', 6, true, 'Ballari'],

    // Bidar Taluks
    ['Taluk', 'Aurad', 1, true, 'Bidar'],
    ['Taluk', 'Bidar', 2, true, 'Bidar'],
    ['Taluk', 'Bhalki', 3, true, 'Bidar'],
    ['Taluk', 'Humnabad', 4, true, 'Bidar'],
    ['Taluk', 'Basavakalyan', 5, true, 'Bidar'],

    // Kalaburagi Taluks
    ['Taluk', 'Afzalpur', 1, true, 'Kalaburagi'],
    ['Taluk', 'Aland', 2, true, 'Kalaburagi'],
    ['Taluk', 'Chincholi', 3, true, 'Kalaburagi'],
    ['Taluk', 'Kalaburagi', 4, true, 'Kalaburagi'],
    ['Taluk', 'Jevargi', 5, true, 'Kalaburagi'],
    ['Taluk', 'Sedam', 6, true, 'Kalaburagi'],
    ['Taluk', 'Shahabad', 7, true, 'Kalaburagi'],

    // Koppal Taluks
    ['Taluk', 'Koppal', 1, true, 'Koppal'],
    ['Taluk', 'Gangavati', 2, true, 'Koppal'],
    ['Taluk', 'Yelburga', 3, true, 'Koppal'],
    ['Taluk', 'Kustagi', 4, true, 'Koppal'],

    // Raichur Taluks
    ['Taluk', 'Devadurga', 1, true, 'Raichur'],
    ['Taluk', 'Lingasugur', 2, true, 'Raichur'],
    ['Taluk', 'Manvi', 3, true, 'Raichur'],
    ['Taluk', 'Raichur', 4, true, 'Raichur'],
    ['Taluk', 'Sindhanur', 5, true, 'Raichur'],

    // Yadgir Taluks
    ['Taluk', 'Shorapur', 1, true, 'Yadgir'],
    ['Taluk', 'Yadgir', 2, true, 'Yadgir'],
    ['Taluk', 'Shahpur', 3, true, 'Yadgir'],
    ['Taluk', 'Surpur', 4, true, 'Yadgir'],

    // Dakshina Kannada Taluks
    ['Taluk', 'Bantwal', 1, true, 'Dakshina Kannada'],
    ['Taluk', 'Belthangady', 2, true, 'Dakshina Kannada'],
    ['Taluk', 'Mangaluru', 3, true, 'Dakshina Kannada'],
    ['Taluk', 'Puttur', 4, true, 'Dakshina Kannada'],
    ['Taluk', 'Sullia', 5, true, 'Dakshina Kannada'],

    // Uttara Kannada Taluks
    ['Taluk', 'Ankola', 1, true, 'Uttara Kannada'],
    ['Taluk', 'Bhatkal', 2, true, 'Uttara Kannada'],
    ['Taluk', 'Haliyal', 3, true, 'Uttara Kannada'],
    ['Taluk', 'Honavar', 4, true, 'Uttara Kannada'],
    ['Taluk', 'Joida', 5, true, 'Uttara Kannada'],
    ['Taluk', 'Karwar', 6, true, 'Uttara Kannada'],
    ['Taluk', 'Kumta', 7, true, 'Uttara Kannada'],
    ['Taluk', 'Mundgod', 8, true, 'Uttara Kannada'],
    ['Taluk', 'Siddapur', 9, true, 'Uttara Kannada'],
    ['Taluk', 'Sirsi', 10, true, 'Uttara Kannada'],
    ['Taluk', 'Yellapur', 11, true, 'Uttara Kannada'],

    // =============================================
    // OTHER LOOKUP CATEGORIES
    // =============================================

    // Crop Types
    ['CropType', 'Arecanut', 1, true, ''],
    ['CropType', 'Coconut', 2, true, ''],
    ['CropType', 'Coffee', 3, true, ''],
    ['CropType', 'Pepper', 4, true, ''],
    ['CropType', 'Paddy', 5, true, ''],
    ['CropType', 'Sugarcane', 6, true, ''],
    ['CropType', 'Cotton', 7, true, ''],
    ['CropType', 'Groundnut', 8, true, ''],

    // Lead Sources
    ['LeadSource', 'Referral', 1, true, ''],
    ['LeadSource', 'Cold Call', 2, true, ''],
    ['LeadSource', 'Walk-in', 3, true, ''],
    ['LeadSource', 'Advertisement', 4, true, ''],
    ['LeadSource', 'Exhibition', 5, true, ''],
    ['LeadSource', 'Dealer', 6, true, ''],

    // Lead Statuses
    ['LeadStatus', 'New', 1, true, ''],
    ['LeadStatus', 'Contacted', 2, true, ''],
    ['LeadStatus', 'Qualified', 3, true, ''],
    ['LeadStatus', 'Not Qualified', 4, true, ''],

    // Irrigation Types
    ['IrrigationType', 'Drip', 1, true, ''],
    ['IrrigationType', 'Sprinkler', 2, true, ''],
    ['IrrigationType', 'Flood', 3, true, ''],
    ['IrrigationType', 'Rainfed', 4, true, ''],
    ['IrrigationType', 'Borewell', 5, true, ''],

    // Visit Statuses
    ['VisitStatus', 'Scheduled', 1, true, ''],
    ['VisitStatus', 'Visited', 2, true, ''],
    ['VisitStatus', 'Cancelled', 3, true, ''],

    // Visit Outcomes
    ['VisitOutcome', 'Successful', 1, true, ''],
    ['VisitOutcome', 'Follow-up Needed', 2, true, ''],
    ['VisitOutcome', 'Not Interested', 3, true, ''],

    // Crop Conditions
    ['CropCondition', 'Healthy', 1, true, ''],
    ['CropCondition', 'Pest Issues', 2, true, ''],
    ['CropCondition', 'Nutrient Deficiency', 3, true, ''],
    ['CropCondition', 'Disease', 4, true, ''],

    // Quotation Statuses
    ['QuotationStatus', 'Draft', 1, true, ''],
    ['QuotationStatus', 'Sent', 2, true, ''],
    ['QuotationStatus', 'Accepted', 3, true, ''],
    ['QuotationStatus', 'Rejected', 4, true, ''],

    // Delivery Statuses
    ['DeliveryStatus', 'Pending', 1, true, ''],
    ['DeliveryStatus', 'Scheduled', 2, true, ''],
    ['DeliveryStatus', 'Delivered', 3, true, ''],
    ['DeliveryStatus', 'Partial', 4, true, ''],

    // Payment Types
    ['PaymentType', 'Advance', 1, true, ''],
    ['PaymentType', 'Partial', 2, true, ''],
    ['PaymentType', 'Final', 3, true, ''],

    // Payment Methods
    ['PaymentMethod', 'Cash', 1, true, ''],
    ['PaymentMethod', 'UPI', 2, true, ''],
    ['PaymentMethod', 'Bank Transfer', 3, true, ''],
    ['PaymentMethod', 'Cheque', 4, true, '']
  ];

  sheet.getRange(2, 1, data.length, 5).setValues(data);
  sheet.autoResizeColumns(1, 5);
}

/**
 * Creates Leads sheet with headers
 *
 * Column mapping (24 columns):
 * A=id, B=rowNumber, C=displayId, D=createdDate, E=farmerName, F=phone, G=whatsapp,
 * H=village, I=taluk, J=district, K=farmSizeAcres, L=cropType, M=cropAge,
 * N=numPlants, O=irrigationType, P=leadSource, Q=leadOwner, R=status, S=remarks,
 * T=lastUpdated, U=isDeleted, V=deletedBy, W=deletedDate, X=deleteReason
 */
function createLeadsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Leads');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Leads');
  }

  // Headers (24 columns)
  const headers = [[
    'id', 'rowNumber', 'displayId', 'createdDate', 'farmerName', 'phone', 'whatsapp',
    'village', 'taluk', 'district', 'farmSizeAcres', 'cropType', 'cropAge',
    'numPlants', 'irrigationType', 'leadSource', 'leadOwner', 'status', 'remarks',
    'lastUpdated', 'isDeleted', 'deletedBy', 'deletedDate', 'deleteReason'
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');

  // Formula in C2 for displayId
  sheet.getRange('C2').setFormula('=IF(B2<>"", "LEA-"&TEXT(B2,"0000"), "")');

  // Format phone columns as text
  sheet.getRange('F:F').setNumberFormat('@'); // phone
  sheet.getRange('G:G').setNumberFormat('@'); // whatsapp

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * Creates FieldVisits sheet
 *
 * Column mapping (22 columns):
 * A=id, B=rowNumber, C=displayId, D=leadId, E=scheduledDate, F=actualDate,
 * G=visitorId, H=visitOutcome, I=cropCondition, J=diagnosisNotes,
 * K=followUpDate, L=status, M=visitedBy, N=quotationRequested,
 * O=assignedTo, P=attachmentFileId, Q=createdBy, R=createdDate, S=isDeleted, T=deletedBy, U=deletedDate, V=deleteReason
 */
function createFieldVisitsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('FieldVisits');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('FieldVisits');
  }

  const headers = [[
    'id', 'rowNumber', 'displayId', 'leadId', 'scheduledDate', 'actualDate',
    'visitorId', 'visitOutcome', 'cropCondition', 'diagnosisNotes',
    'followUpDate', 'status', 'visitedBy', 'quotationRequested',
    'assignedTo', 'attachmentFileId', 'createdBy', 'createdDate',
    'isDeleted', 'deletedBy', 'deletedDate', 'deleteReason'
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');

  // Formula for displayId
  sheet.getRange('C2').setFormula('=IF(B2<>"", "VIS-"&TEXT(B2,"0000"), "")');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * Creates Quotations sheet
 *
 * Column mapping (19 columns):
 * A=id, B=rowNumber, C=displayId, D=leadId, E=visitId, F=quoteDate,
 * G=quoteAmount, H=preparedBy, I=validUntil, J=status, K=notes,
 * L=attachmentFileId, M=deliveryStatus, N=deliveryDate, O=lastUpdated,
 * P=isDeleted, Q=deletedBy, R=deletedDate, S=deleteReason
 */
function createQuotationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Quotations');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Quotations');
  }

  const headers = [[
    'id', 'rowNumber', 'displayId', 'leadId', 'visitId', 'quoteDate',
    'quoteAmount', 'preparedBy', 'validUntil', 'status', 'notes', 'attachmentFileId',
    'deliveryStatus', 'deliveryDate', 'lastUpdated', 'isDeleted', 'deletedBy', 'deletedDate', 'deleteReason'
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');

  // Formula for displayId
  sheet.getRange('C2').setFormula('=IF(B2<>"", "QUO-"&TEXT(B2,"0000"), "")');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * Creates Payments sheet
 */
function createPaymentsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Payments');

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Payments');
  }

  const headers = [[
    'id', 'rowNumber', 'displayId', 'quoteId', 'paymentDate', 'paymentAmount',
    'paymentType', 'paymentMethod', 'transactionRef', 'receivedBy', 'notes',
    'isDeleted', 'deletedBy', 'deletedDate', 'deleteReason'
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');

  // Formula for displayId
  sheet.getRange('C2').setFormula('=IF(B2<>"", "PAY-"&TEXT(B2,"0000"), "")');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}

// Note: onOpen() menu function is in IdGenerator.gs to avoid duplication
