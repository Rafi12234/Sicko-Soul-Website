-- SICKO SOUL | one-time, idempotent correction for the November 2026 import.
-- Execute manually against the SAME local schema used by backend/.env.
-- IMPORTANT: Back up the database first. This does NOT delete products, inventory,
-- product images, orders, or variants. No migration required.
-- It only removes the eight mistakenly auto-linked T-shirts from the artificial
-- drop created by the initial catalogue import (code SS_REAL_DROP).
-- Other/new drops and their memberships are untouched.

START TRANSACTION;

-- Confirm the wrong drop exists and note its current status before applying:
SELECT c.collection_id, c.code, c.slug, c.name, c.status,
       (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id=c.collection_id) AS linked_products
FROM collections c WHERE c.code = 'SS_REAL_DROP' AND c.slug = 'real-tshirt-release';

-- Remove membership of ONLY these 8 imported regular products in ONLY that drop.
DELETE cp FROM collection_products AS cp
JOIN collections AS c ON c.collection_id = cp.collection_id
JOIN products AS p ON p.product_id = cp.product_id
WHERE c.code = 'SS_REAL_DROP'
  AND c.slug = 'real-tshirt-release'
  AND p.public_id IN (
    'SS-REAL-WARRIOR','SS-REAL-NINJA','SS-REAL-ICEMAN',
    'SS-REAL-HORSE_GAME','SS-REAL-SICKO_BIRD','SS-REAL-RETURN',
    'SS-REAL-DINOSOUL','SS-REAL-GODS_PLAN'
  );

-- Hide the artificial drop if it is now empty; preserve any manually-added
-- memberships so a genuine drop is never accidentally removed.
UPDATE collections AS c
SET c.status = 'DRAFT', c.updated_at = NOW()
WHERE c.code = 'SS_REAL_DROP'
  AND c.slug = 'real-tshirt-release'
  AND NOT EXISTS (
    SELECT 1 FROM collection_products AS cp WHERE cp.collection_id = c.collection_id
  );

COMMIT;

-- VERIFICATION: all eight products remain active in the normal catalogue.
SELECT p.public_id, p.name, p.status, pc.slug AS category_slug
FROM products p JOIN product_categories pc ON pc.category_id = p.category_id
WHERE p.public_id IN (
  'SS-REAL-WARRIOR','SS-REAL-NINJA','SS-REAL-ICEMAN',
  'SS-REAL-HORSE_GAME','SS-REAL-SICKO_BIRD','SS-REAL-RETURN',
  'SS-REAL-DINOSOUL','SS-REAL-GODS_PLAN'
)
ORDER BY p.name;

-- Expect 0 for linked_regular_tshirts_in_wrong_drop.
SELECT COUNT(*) AS linked_regular_tshirts_in_wrong_drop
FROM collection_products cp
JOIN collections c ON c.collection_id = cp.collection_id
JOIN products p ON p.product_id = cp.product_id
WHERE c.code = 'SS_REAL_DROP' AND c.slug = 'real-tshirt-release'
  AND p.public_id IN (
    'SS-REAL-WARRIOR','SS-REAL-NINJA','SS-REAL-ICEMAN',
    'SS-REAL-HORSE_GAME','SS-REAL-SICKO_BIRD','SS-REAL-RETURN',
    'SS-REAL-DINOSOUL','SS-REAL-GODS_PLAN'
  );

-- Expect DRAFT when that accidental collection has no other members.
SELECT c.code, c.slug, c.status,
       COUNT(cp.product_id) AS remaining_drop_products
FROM collections c
LEFT JOIN collection_products cp ON cp.collection_id=c.collection_id
WHERE c.code='SS_REAL_DROP' AND c.slug='real-tshirt-release'
GROUP BY c.collection_id, c.code, c.slug, c.status;
