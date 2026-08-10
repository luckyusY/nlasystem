INSERT INTO geoai.parcels (upi, district, sector, cell, area_m2, land_use, zoning, registration_status, geometry, is_synthetic)
SELECT
  ((n % 5) + 1)::text || '/' || lpad(((n % 12) + 1)::text, 2, '0') || '/' ||
  lpad(((n % 8) + 1)::text, 2, '0') || '/' || lpad(((n % 6) + 1)::text, 2, '0') || '/' ||
  lpad(n::text, 4, '0'),
  (ARRAY['Gasabo','Kicukiro','Nyarugenge','Musanze','Huye','Bugesera'])[(n % 6) + 1],
  (ARRAY['Remera','Niboye','Kigali','Muhoza','Ngoma','Nyamata'])[(n % 6) + 1],
  (ARRAY['Rukiri','Kabeza','Amahoro','Karama','Gasharu','Ntarama'])[(n % 6) + 1],
  850 + ((n * 347) % 8100),
  (ARRAY['Residential','Agriculture','Commercial','Mixed Use','Conservation'])[(n % 5) + 1],
  (ARRAY['R1','R2','R3','C1','AG','OS'])[(n % 6) + 1],
  CASE WHEN n % 5 < 3 THEN 'Registered' ELSE 'Under review' END,
  ST_MakeEnvelope(
    500000 + (n % 16) * 120,
    9780000 + floor((n - 1) / 16) * 120,
    500090 + (n % 16) * 120,
    9780090 + floor((n - 1) / 16) * 120,
    32736
  ),
  true
FROM generate_series(1, 128) AS n
ON CONFLICT (upi) DO NOTHING;

UPDATE geoai.parcels
SET upi = '1/02/03/04/0012', district = 'Gasabo', sector = 'Remera', cell = 'Rukiri',
    area_m2 = 3250, land_use = 'Residential', zoning = 'R2', registration_status = 'Registered'
WHERE upi = '2/02/02/02/0001';

INSERT INTO geoai.documents (title, category, is_demo) VALUES
  ('Land Administration Procedures — DEMO', 'SOPs', true),
  ('Subdivision Review Guide — DEMO', 'Technical Guidelines', true),
  ('Land Use Planning Reference — DEMO', 'Land Use Plans', true),
  ('NSDI Metadata Manual — DEMO', 'NSDI Manuals', true)
ON CONFLICT DO NOTHING;
