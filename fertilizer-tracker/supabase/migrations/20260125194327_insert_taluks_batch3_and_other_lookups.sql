-- ============================================================================
-- INSERT TALUKS - BATCH 3 (Kalaburagi Division) + ALL OTHER LOOKUPS
-- ============================================================================

-- Kalaburagi Division Taluks
INSERT INTO lookups (id, category, value, parent_value, display_order, active) VALUES
  -- Ballari (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Ballari', 'Ballari (Bellary)', 136, true),
  (gen_random_uuid(), 'Taluk', 'Bellary', 'Ballari (Bellary)', 137, true),
  (gen_random_uuid(), 'Taluk', 'Hadagalli', 'Ballari (Bellary)', 138, true),
  (gen_random_uuid(), 'Taluk', 'Hagaribommanahalli', 'Ballari (Bellary)', 139, true),
  (gen_random_uuid(), 'Taluk', 'Hospet', 'Ballari (Bellary)', 140, true),
  (gen_random_uuid(), 'Taluk', 'Kudligi', 'Ballari (Bellary)', 141, true),
  (gen_random_uuid(), 'Taluk', 'Sandur', 'Ballari (Bellary)', 142, true),

  -- Bidar (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Aurad', 'Bidar', 143, true),
  (gen_random_uuid(), 'Taluk', 'Basavakalyan', 'Bidar', 144, true),
  (gen_random_uuid(), 'Taluk', 'Bhalki', 'Bidar', 145, true),
  (gen_random_uuid(), 'Taluk', 'Bidar', 'Bidar', 146, true),
  (gen_random_uuid(), 'Taluk', 'Humnabad', 'Bidar', 147, true),

  -- Kalaburagi (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Afzalpur', 'Kalaburagi (Gulbarga)', 148, true),
  (gen_random_uuid(), 'Taluk', 'Aland', 'Kalaburagi (Gulbarga)', 149, true),
  (gen_random_uuid(), 'Taluk', 'Chincholi', 'Kalaburagi (Gulbarga)', 150, true),
  (gen_random_uuid(), 'Taluk', 'Chitapur', 'Kalaburagi (Gulbarga)', 151, true),
  (gen_random_uuid(), 'Taluk', 'Gulbarga', 'Kalaburagi (Gulbarga)', 152, true),
  (gen_random_uuid(), 'Taluk', 'Jewargi', 'Kalaburagi (Gulbarga)', 153, true),
  (gen_random_uuid(), 'Taluk', 'Sedam', 'Kalaburagi (Gulbarga)', 154, true),

  -- Koppal (4 taluks)
  (gen_random_uuid(), 'Taluk', 'Gangavathi', 'Koppal', 155, true),
  (gen_random_uuid(), 'Taluk', 'Koppal', 'Koppal', 156, true),
  (gen_random_uuid(), 'Taluk', 'Kushtagi', 'Koppal', 157, true),
  (gen_random_uuid(), 'Taluk', 'Yelburga', 'Koppal', 158, true),

  -- Raichur (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Devadurga', 'Raichur', 159, true),
  (gen_random_uuid(), 'Taluk', 'Lingsugur', 'Raichur', 160, true),
  (gen_random_uuid(), 'Taluk', 'Manvi', 'Raichur', 161, true),
  (gen_random_uuid(), 'Taluk', 'Raichur', 'Raichur', 162, true),
  (gen_random_uuid(), 'Taluk', 'Sindhnur', 'Raichur', 163, true),

  -- Yadgir (3 taluks)
  (gen_random_uuid(), 'Taluk', 'Shahapur', 'Yadgir', 164, true),
  (gen_random_uuid(), 'Taluk', 'Shorapur', 'Yadgir', 165, true),
  (gen_random_uuid(), 'Taluk', 'Yadgir', 'Yadgir', 166, true),

  -- Dakshina Kannada (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Bantwal', 'Dakshina Kannada', 167, true),
  (gen_random_uuid(), 'Taluk', 'Belthangady', 'Dakshina Kannada', 168, true),
  (gen_random_uuid(), 'Taluk', 'Mangaluru', 'Dakshina Kannada', 169, true),
  (gen_random_uuid(), 'Taluk', 'Puttur', 'Dakshina Kannada', 170, true),
  (gen_random_uuid(), 'Taluk', 'Sullia', 'Dakshina Kannada', 171, true),

  -- Uttara Kannada (11 taluks)
  (gen_random_uuid(), 'Taluk', 'Ankola', 'Uttara Kannada', 172, true),
  (gen_random_uuid(), 'Taluk', 'Bhatkal', 'Uttara Kannada', 173, true),
  (gen_random_uuid(), 'Taluk', 'Haliyal', 'Uttara Kannada', 174, true),
  (gen_random_uuid(), 'Taluk', 'Honnavar', 'Uttara Kannada', 175, true),
  (gen_random_uuid(), 'Taluk', 'Joida', 'Uttara Kannada', 176, true),
  (gen_random_uuid(), 'Taluk', 'Karwar', 'Uttara Kannada', 177, true),
  (gen_random_uuid(), 'Taluk', 'Kumta', 'Uttara Kannada', 178, true),
  (gen_random_uuid(), 'Taluk', 'Mundgod', 'Uttara Kannada', 179, true),
  (gen_random_uuid(), 'Taluk', 'Siddapur', 'Uttara Kannada', 180, true),
  (gen_random_uuid(), 'Taluk', 'Sirsi', 'Uttara Kannada', 181, true),
  (gen_random_uuid(), 'Taluk', 'Yellapur', 'Uttara Kannada', 182, true);

-- ============================================================================
-- OTHER LOOKUP CATEGORIES
-- ============================================================================

-- Crop Types
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'CropType', 'Arecanut', 1, true),
  (gen_random_uuid(), 'CropType', 'Banana', 2, true),
  (gen_random_uuid(), 'CropType', 'Coconut', 3, true),
  (gen_random_uuid(), 'CropType', 'Coffee', 4, true),
  (gen_random_uuid(), 'CropType', 'Mango', 5, true),
  (gen_random_uuid(), 'CropType', 'Paddy', 6, true),
  (gen_random_uuid(), 'CropType', 'Spices', 7, true),
  (gen_random_uuid(), 'CropType', 'Sugarcane', 8, true);

-- Lead Sources
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'LeadSource', 'Direct Visit', 1, true),
  (gen_random_uuid(), 'LeadSource', 'Phone Inquiry', 2, true),
  (gen_random_uuid(), 'LeadSource', 'Referral', 3, true),
  (gen_random_uuid(), 'LeadSource', 'Website', 4, true),
  (gen_random_uuid(), 'LeadSource', 'WhatsApp', 5, true),
  (gen_random_uuid(), 'LeadSource', 'Event/Exhibition', 6, true);

-- Lead Statuses
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'LeadStatus', 'New', 1, true),
  (gen_random_uuid(), 'LeadStatus', 'Contacted', 2, true),
  (gen_random_uuid(), 'LeadStatus', 'Qualified', 3, true),
  (gen_random_uuid(), 'LeadStatus', 'Not Qualified', 4, true);

-- Irrigation Types
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'IrrigationType', 'Borewell', 1, true),
  (gen_random_uuid(), 'IrrigationType', 'Canal', 2, true),
  (gen_random_uuid(), 'IrrigationType', 'Drip', 3, true),
  (gen_random_uuid(), 'IrrigationType', 'Rainfed', 4, true),
  (gen_random_uuid(), 'IrrigationType', 'Sprinkler', 5, true);

-- Visit Outcomes
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'VisitOutcome', 'Interested', 1, true),
  (gen_random_uuid(), 'VisitOutcome', 'Not Interested', 2, true),
  (gen_random_uuid(), 'VisitOutcome', 'Follow-up Required', 3, true);

-- Visit Statuses
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'VisitStatus', 'Scheduled', 1, true),
  (gen_random_uuid(), 'VisitStatus', 'Completed', 2, true),
  (gen_random_uuid(), 'VisitStatus', 'Cancelled', 3, true);

-- Crop Conditions
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'CropCondition', 'Excellent', 1, true),
  (gen_random_uuid(), 'CropCondition', 'Good', 2, true),
  (gen_random_uuid(), 'CropCondition', 'Fair', 3, true),
  (gen_random_uuid(), 'CropCondition', 'Poor', 4, true);

-- Quotation Statuses
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'QuotationStatus', 'Draft', 1, true),
  (gen_random_uuid(), 'QuotationStatus', 'Sent', 2, true),
  (gen_random_uuid(), 'QuotationStatus', 'Accepted', 3, true),
  (gen_random_uuid(), 'QuotationStatus', 'Rejected', 4, true);

-- Delivery Statuses
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'DeliveryStatus', 'Pending', 1, true),
  (gen_random_uuid(), 'DeliveryStatus', 'Scheduled', 2, true),
  (gen_random_uuid(), 'DeliveryStatus', 'Delivered', 3, true),
  (gen_random_uuid(), 'DeliveryStatus', 'Partial', 4, true);

-- Payment Types
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'PaymentType', 'Advance', 1, true),
  (gen_random_uuid(), 'PaymentType', 'Partial', 2, true),
  (gen_random_uuid(), 'PaymentType', 'Final', 3, true);

-- Payment Methods
INSERT INTO lookups (id, category, value, display_order, active) VALUES
  (gen_random_uuid(), 'PaymentMethod', 'Cash', 1, true),
  (gen_random_uuid(), 'PaymentMethod', 'UPI', 2, true),
  (gen_random_uuid(), 'PaymentMethod', 'Bank Transfer', 3, true),
  (gen_random_uuid(), 'PaymentMethod', 'Cheque', 4, true);
