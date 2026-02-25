-- ============================================================================
-- INSERT TALUKS - BATCH 1 (Bengaluru Division)
-- ============================================================================

-- Bengaluru Division Taluks with parent districts
INSERT INTO lookups (id, category, value, parent_value, display_order, active) VALUES
  -- Bengaluru Urban (10 taluks)
  (gen_random_uuid(), 'Taluk', 'Anekal', 'Bengaluru Urban', 1, true),
  (gen_random_uuid(), 'Taluk', 'Bengaluru East', 'Bengaluru Urban', 2, true),
  (gen_random_uuid(), 'Taluk', 'Bengaluru North', 'Bengaluru Urban', 3, true),
  (gen_random_uuid(), 'Taluk', 'Bengaluru South', 'Bengaluru Urban', 4, true),
  (gen_random_uuid(), 'Taluk', 'Dasarahalli', 'Bengaluru Urban', 5, true),
  (gen_random_uuid(), 'Taluk', 'Rajarajeshwari Nagar', 'Bengaluru Urban', 6, true),
  (gen_random_uuid(), 'Taluk', 'Mahadevapura', 'Bengaluru Urban', 7, true),
  (gen_random_uuid(), 'Taluk', 'Bommanahalli', 'Bengaluru Urban', 8, true),
  (gen_random_uuid(), 'Taluk', 'Yelahanka', 'Bengaluru Urban', 9, true),
  (gen_random_uuid(), 'Taluk', 'Byatarayanapura', 'Bengaluru Urban', 10, true),

  -- Bengaluru Rural (4 taluks)
  (gen_random_uuid(), 'Taluk', 'Devanahalli', 'Bengaluru Rural', 11, true),
  (gen_random_uuid(), 'Taluk', 'Doddaballapura', 'Bengaluru Rural', 12, true),
  (gen_random_uuid(), 'Taluk', 'Hosakote', 'Bengaluru Rural', 13, true),
  (gen_random_uuid(), 'Taluk', 'Nelamangala', 'Bengaluru Rural', 14, true),

  -- Chikkaballapur (6 taluks)
  (gen_random_uuid(), 'Taluk', 'Bagepalli', 'Chikkaballapur', 15, true),
  (gen_random_uuid(), 'Taluk', 'Chikkaballapur', 'Chikkaballapur', 16, true),
  (gen_random_uuid(), 'Taluk', 'Chintamani', 'Chikkaballapur', 17, true),
  (gen_random_uuid(), 'Taluk', 'Gauribidanur', 'Chikkaballapur', 18, true),
  (gen_random_uuid(), 'Taluk', 'Gudibande', 'Chikkaballapur', 19, true),
  (gen_random_uuid(), 'Taluk', 'Shidlaghatta', 'Chikkaballapur', 20, true),

  -- Chitradurga (6 taluks)
  (gen_random_uuid(), 'Taluk', 'Challakere', 'Chitradurga', 21, true),
  (gen_random_uuid(), 'Taluk', 'Chitradurga', 'Chitradurga', 22, true),
  (gen_random_uuid(), 'Taluk', 'Hiriyur', 'Chitradurga', 23, true),
  (gen_random_uuid(), 'Taluk', 'Holalkere', 'Chitradurga', 24, true),
  (gen_random_uuid(), 'Taluk', 'Hosadurga', 'Chitradurga', 25, true),
  (gen_random_uuid(), 'Taluk', 'Molakalmuru', 'Chitradurga', 26, true),

  -- Davanagere (6 taluks)
  (gen_random_uuid(), 'Taluk', 'Channagiri', 'Davanagere', 27, true),
  (gen_random_uuid(), 'Taluk', 'Davanagere', 'Davanagere', 28, true),
  (gen_random_uuid(), 'Taluk', 'Harihara', 'Davanagere', 29, true),
  (gen_random_uuid(), 'Taluk', 'Harihar', 'Davanagere', 30, true),
  (gen_random_uuid(), 'Taluk', 'Honnali', 'Davanagere', 31, true),
  (gen_random_uuid(), 'Taluk', 'Jagalur', 'Davanagere', 32, true),

  -- Kolar (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Bagepalli', 'Kolar', 33, true),
  (gen_random_uuid(), 'Taluk', 'Bangarpet', 'Kolar', 34, true),
  (gen_random_uuid(), 'Taluk', 'Kolar', 'Kolar', 35, true),
  (gen_random_uuid(), 'Taluk', 'Malur', 'Kolar', 36, true),
  (gen_random_uuid(), 'Taluk', 'Mulbagal', 'Kolar', 37, true),

  -- Ramanagara (4 taluks)
  (gen_random_uuid(), 'Taluk', 'Channapatna', 'Ramanagara', 38, true),
  (gen_random_uuid(), 'Taluk', 'Kanakapura', 'Ramanagara', 39, true),
  (gen_random_uuid(), 'Taluk', 'Magadi', 'Ramanagara', 40, true),
  (gen_random_uuid(), 'Taluk', 'Ramanagara', 'Ramanagara', 41, true),

  -- Shivamogga (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Bhadravati', 'Shivamogga (Shimoga)', 42, true),
  (gen_random_uuid(), 'Taluk', 'Hosanagar', 'Shivamogga (Shimoga)', 43, true),
  (gen_random_uuid(), 'Taluk', 'Sagar', 'Shivamogga (Shimoga)', 44, true),
  (gen_random_uuid(), 'Taluk', 'Shikaripura', 'Shivamogga (Shimoga)', 45, true),
  (gen_random_uuid(), 'Taluk', 'Shimoga', 'Shivamogga (Shimoga)', 46, true),
  (gen_random_uuid(), 'Taluk', 'Sorab', 'Shivamogga (Shimoga)', 47, true),
  (gen_random_uuid(), 'Taluk', 'Thirthahalli', 'Shivamogga (Shimoga)', 48, true),

  -- Tumakuru (10 taluks)
  (gen_random_uuid(), 'Taluk', 'Chiknayakanhalli', 'Tumakuru (Tumkur)', 49, true),
  (gen_random_uuid(), 'Taluk', 'Gubbi', 'Tumakuru (Tumkur)', 50, true),
  (gen_random_uuid(), 'Taluk', 'Kunigal', 'Tumakuru (Tumkur)', 51, true),
  (gen_random_uuid(), 'Taluk', 'Madhugiri', 'Tumakuru (Tumkur)', 52, true),
  (gen_random_uuid(), 'Taluk', 'Pavagada', 'Tumakuru (Tumkur)', 53, true),
  (gen_random_uuid(), 'Taluk', 'Sira', 'Tumakuru (Tumkur)', 54, true),
  (gen_random_uuid(), 'Taluk', 'Tiptur', 'Tumakuru (Tumkur)', 55, true),
  (gen_random_uuid(), 'Taluk', 'Tumakuru', 'Tumakuru (Tumkur)', 56, true),
  (gen_random_uuid(), 'Taluk', 'Turuvekere', 'Tumakuru (Tumkur)', 57, true),
  (gen_random_uuid(), 'Taluk', 'Koratagere', 'Tumakuru (Tumkur)', 58, true),

  -- Chikkamagaluru (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Chikkamagaluru', 'Chikkamagaluru', 59, true),
  (gen_random_uuid(), 'Taluk', 'Kadur', 'Chikkamagaluru', 60, true),
  (gen_random_uuid(), 'Taluk', 'Koppa', 'Chikkamagaluru', 61, true),
  (gen_random_uuid(), 'Taluk', 'Mudigere', 'Chikkamagaluru', 62, true),
  (gen_random_uuid(), 'Taluk', 'Narasimharajapura', 'Chikkamagaluru', 63, true),
  (gen_random_uuid(), 'Taluk', 'Sringeri', 'Chikkamagaluru', 64, true),
  (gen_random_uuid(), 'Taluk', 'Tarikere', 'Chikkamagaluru', 65, true),

  -- Udupi (3 taluks)
  (gen_random_uuid(), 'Taluk', 'Kundapura', 'Udupi', 66, true),
  (gen_random_uuid(), 'Taluk', 'Karkala', 'Udupi', 67, true),
  (gen_random_uuid(), 'Taluk', 'Udupi', 'Udupi', 68, true),

  -- Kodagu (3 taluks)
  (gen_random_uuid(), 'Taluk', 'Madikeri', 'Kodagu', 69, true),
  (gen_random_uuid(), 'Taluk', 'Somwarpet', 'Kodagu', 70, true),
  (gen_random_uuid(), 'Taluk', 'Virajpet', 'Kodagu', 71, true);
