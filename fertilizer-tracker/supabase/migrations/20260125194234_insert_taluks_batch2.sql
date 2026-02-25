-- ============================================================================
-- INSERT TALUKS - BATCH 2 (Belagavi + Mysuru Division)
-- ============================================================================

-- Belagavi Division + Mysuru Division Taluks
INSERT INTO lookups (id, category, value, parent_value, display_order, active) VALUES
  -- Bagalkot (6 taluks)
  (gen_random_uuid(), 'Taluk', 'Badami', 'Bagalkot', 72, true),
  (gen_random_uuid(), 'Taluk', 'Bagalkot', 'Bagalkot', 73, true),
  (gen_random_uuid(), 'Taluk', 'Bilgi', 'Bagalkot', 74, true),
  (gen_random_uuid(), 'Taluk', 'Hunagund', 'Bagalkot', 75, true),
  (gen_random_uuid(), 'Taluk', 'Jamkhandi', 'Bagalkot', 76, true),
  (gen_random_uuid(), 'Taluk', 'Mudhol', 'Bagalkot', 77, true),

  -- Belagavi (10 taluks)
  (gen_random_uuid(), 'Taluk', 'Bailhongal', 'Belagavi (Belgaum)', 78, true),
  (gen_random_uuid(), 'Taluk', 'Belagavi', 'Belagavi (Belgaum)', 79, true),
  (gen_random_uuid(), 'Taluk', 'Chikodi', 'Belagavi (Belgaum)', 80, true),
  (gen_random_uuid(), 'Taluk', 'Gokak', 'Belagavi (Belgaum)', 81, true),
  (gen_random_uuid(), 'Taluk', 'Hukkeri', 'Belagavi (Belgaum)', 82, true),
  (gen_random_uuid(), 'Taluk', 'Khanapur', 'Belagavi (Belgaum)', 83, true),
  (gen_random_uuid(), 'Taluk', 'Raibag', 'Belagavi (Belgaum)', 84, true),
  (gen_random_uuid(), 'Taluk', 'Ramdurg', 'Belagavi (Belgaum)', 85, true),
  (gen_random_uuid(), 'Taluk', 'Saundatti', 'Belagavi (Belgaum)', 86, true),
  (gen_random_uuid(), 'Taluk', 'Parasgad', 'Belagavi (Belgaum)', 87, true),

  -- Dharwad (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Dharwad', 'Dharwad', 88, true),
  (gen_random_uuid(), 'Taluk', 'Hubli', 'Dharwad', 89, true),
  (gen_random_uuid(), 'Taluk', 'Kalghatgi', 'Dharwad', 90, true),
  (gen_random_uuid(), 'Taluk', 'Kundgol', 'Dharwad', 91, true),
  (gen_random_uuid(), 'Taluk', 'Navalgund', 'Dharwad', 92, true),

  -- Gadag (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Gadag', 'Gadag', 93, true),
  (gen_random_uuid(), 'Taluk', 'Mundargi', 'Gadag', 94, true),
  (gen_random_uuid(), 'Taluk', 'Nargund', 'Gadag', 95, true),
  (gen_random_uuid(), 'Taluk', 'Ron', 'Gadag', 96, true),
  (gen_random_uuid(), 'Taluk', 'Shirhatti', 'Gadag', 97, true),

  -- Haveri (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Byadgi', 'Haveri', 98, true),
  (gen_random_uuid(), 'Taluk', 'Hangal', 'Haveri', 99, true),
  (gen_random_uuid(), 'Taluk', 'Haveri', 'Haveri', 100, true),
  (gen_random_uuid(), 'Taluk', 'Hirekerur', 'Haveri', 101, true),
  (gen_random_uuid(), 'Taluk', 'Ranebennur', 'Haveri', 102, true),
  (gen_random_uuid(), 'Taluk', 'Savanur', 'Haveri', 103, true),
  (gen_random_uuid(), 'Taluk', 'Shiggaon', 'Haveri', 104, true),

  -- Vijayapura (5 taluks)
  (gen_random_uuid(), 'Taluk', 'Basavana Bagevadi', 'Vijayapura (Bijapur)', 105, true),
  (gen_random_uuid(), 'Taluk', 'Bijapur', 'Vijayapura (Bijapur)', 106, true),
  (gen_random_uuid(), 'Taluk', 'Indi', 'Vijayapura (Bijapur)', 107, true),
  (gen_random_uuid(), 'Taluk', 'Muddebihal', 'Vijayapura (Bijapur)', 108, true),
  (gen_random_uuid(), 'Taluk', 'Sindgi', 'Vijayapura (Bijapur)', 109, true),

  -- Chamarajanagar (4 taluks)
  (gen_random_uuid(), 'Taluk', 'Chamarajanagar', 'Chamarajanagar', 110, true),
  (gen_random_uuid(), 'Taluk', 'Gundlupet', 'Chamarajanagar', 111, true),
  (gen_random_uuid(), 'Taluk', 'Kollegal', 'Chamarajanagar', 112, true),
  (gen_random_uuid(), 'Taluk', 'Yelandur', 'Chamarajanagar', 113, true),

  -- Hassan (8 taluks)
  (gen_random_uuid(), 'Taluk', 'Alur', 'Hassan', 114, true),
  (gen_random_uuid(), 'Taluk', 'Arasikere', 'Hassan', 115, true),
  (gen_random_uuid(), 'Taluk', 'Arkalgud', 'Hassan', 116, true),
  (gen_random_uuid(), 'Taluk', 'Belur', 'Hassan', 117, true),
  (gen_random_uuid(), 'Taluk', 'Channarayapatna', 'Hassan', 118, true),
  (gen_random_uuid(), 'Taluk', 'Hassan', 'Hassan', 119, true),
  (gen_random_uuid(), 'Taluk', 'Holenarasipur', 'Hassan', 120, true),
  (gen_random_uuid(), 'Taluk', 'Sakaleshpur', 'Hassan', 121, true),

  -- Mandya (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Krishnarajpet', 'Mandya', 122, true),
  (gen_random_uuid(), 'Taluk', 'Maddur', 'Mandya', 123, true),
  (gen_random_uuid(), 'Taluk', 'Malavalli', 'Mandya', 124, true),
  (gen_random_uuid(), 'Taluk', 'Mandya', 'Mandya', 125, true),
  (gen_random_uuid(), 'Taluk', 'Nagamangala', 'Mandya', 126, true),
  (gen_random_uuid(), 'Taluk', 'Pandavapura', 'Mandya', 127, true),
  (gen_random_uuid(), 'Taluk', 'Srirangapatna', 'Mandya', 128, true),

  -- Mysuru (7 taluks)
  (gen_random_uuid(), 'Taluk', 'Heggadadevankote', 'Mysuru (Mysore)', 129, true),
  (gen_random_uuid(), 'Taluk', 'Hunsur', 'Mysuru (Mysore)', 130, true),
  (gen_random_uuid(), 'Taluk', 'Krishnarajanagara', 'Mysuru (Mysore)', 131, true),
  (gen_random_uuid(), 'Taluk', 'Mysuru', 'Mysuru (Mysore)', 132, true),
  (gen_random_uuid(), 'Taluk', 'Nanjanagud', 'Mysuru (Mysore)', 133, true),
  (gen_random_uuid(), 'Taluk', 'Piriyapatna', 'Mysuru (Mysore)', 134, true),
  (gen_random_uuid(), 'Taluk', 'T. Narasipura', 'Mysuru (Mysore)', 135, true);
