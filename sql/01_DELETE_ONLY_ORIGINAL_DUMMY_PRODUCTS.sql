-- SICKO SOUL / local MySQL Workbench / ORIGINAL DEMO CATALOGUE CLEANUP
-- BACK UP YOUR DATABASE FIRST. Stop the backend while executing this script.
-- No schema migrations. No live/real SS-REAL-* products are targeted.
-- This script physically deletes ONLY the original 11 demo products and the
-- archived test T-shirt seen on the old site. All targets must be ARCHIVED.
-- IMPORTANT: If any targeted product has an order item or review, it ABORTS
-- rather than deleting purchase history. No foreign keys are disabled.
-- Before running, inspect the PREVIEW result grid below.

SELECT DATABASE() AS database_being_changed;

DROP TEMPORARY TABLE IF EXISTS ss_dummy_products_to_delete;
CREATE TEMPORARY TABLE ss_dummy_products_to_delete (
  product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL
);

INSERT INTO ss_dummy_products_to_delete(product_id, public_id)
SELECT product_id, public_id
FROM products
WHERE status = 'ARCHIVED'
  AND public_id IN (
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
    'tshirt-01', 'baggy-01',
    'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
    'hoodie-01', 'SS-13E625D527741'
  );

DROP TEMPORARY TABLE IF EXISTS ss_dummy_variants_to_delete;
CREATE TEMPORARY TABLE ss_dummy_variants_to_delete (
  variant_id BIGINT UNSIGNED NOT NULL PRIMARY KEY
);
INSERT INTO ss_dummy_variants_to_delete(variant_id)
SELECT pv.variant_id
FROM product_variants pv
JOIN ss_dummy_products_to_delete dp ON dp.product_id = pv.product_id;

-- PREVIEW: these are the ONLY products this script can delete.
SELECT p.public_id, p.name, p.status,
  (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.product_id) AS size_variants,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) AS order_item_references,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.product_id) AS review_references
FROM products p
JOIN ss_dummy_products_to_delete dp ON dp.product_id = p.product_id
ORDER BY p.public_id;

-- If this shows any ACTIVE/DRAFT items, the script will refuse to delete them.
SELECT public_id, name, status AS unexpected_status
FROM products
WHERE public_id IN (
  'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
  'tshirt-01', 'baggy-01',
  'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
  'hoodie-01', 'SS-13E625D527741'
) AND status <> 'ARCHIVED';

-- If historical orders/reviews exist, STOP rather than deleting history.
-- This uses a stored procedure solely to make all changes atomic and guarded.
DROP PROCEDURE IF EXISTS ss_delete_original_demo_products;
DELIMITER $$
CREATE PROCEDURE ss_delete_original_demo_products()
BEGIN
  DECLARE blocking_orders INT DEFAULT 0;
  DECLARE blocking_reviews INT DEFAULT 0;
  DECLARE non_archived INT DEFAULT 0;
  DECLARE remove_count INT DEFAULT 0;
  -- A failed DELETE or a failed safety guard must never leave half the cleanup.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SELECT COUNT(*) INTO non_archived
  FROM products WHERE public_id IN (
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
    'tshirt-01', 'baggy-01',
    'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
    'hoodie-01', 'SS-13E625D527741'
  ) AND status <> 'ARCHIVED';

  IF non_archived <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ABORTED: a listed demo product is not archived. No rows deleted.';
  END IF;

  SELECT COUNT(*) INTO blocking_orders
  FROM order_items oi
  LEFT JOIN ss_dummy_products_to_delete dp ON dp.product_id = oi.product_id
  LEFT JOIN ss_dummy_variants_to_delete dv ON dv.variant_id = oi.variant_id
  WHERE dp.product_id IS NOT NULL OR dv.variant_id IS NOT NULL;

  IF blocking_orders <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ABORTED: demo products are linked to orders. No rows deleted. Preserve order history.';
  END IF;

  SELECT COUNT(*) INTO blocking_reviews
  FROM product_reviews pr
  JOIN ss_dummy_products_to_delete dp ON dp.product_id = pr.product_id;

  IF blocking_reviews <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ABORTED: demo products are linked to reviews. No rows deleted.';
  END IF;

  START TRANSACTION;
  SELECT COUNT(*) INTO remove_count FROM ss_dummy_products_to_delete;

  -- Remove only children belonging to the explicit archived demo IDs.
  DELETE cp FROM collection_products cp
    JOIN ss_dummy_products_to_delete dp ON dp.product_id = cp.product_id;
  DELETE ci FROM cart_items ci
    JOIN ss_dummy_variants_to_delete dv ON dv.variant_id = ci.variant_id;
  DELETE im FROM inventory_movements im
    JOIN ss_dummy_variants_to_delete dv ON dv.variant_id = im.variant_id;
  DELETE ist FROM inventory_stock ist
    JOIN ss_dummy_variants_to_delete dv ON dv.variant_id = ist.variant_id;
  DELETE pf FROM product_features pf
    JOIN ss_dummy_products_to_delete dp ON dp.product_id = pf.product_id;
  DELETE pi FROM product_images pi
    JOIN ss_dummy_products_to_delete dp ON dp.product_id = pi.product_id;
  DELETE pv FROM product_variants pv
    JOIN ss_dummy_variants_to_delete dv ON dv.variant_id = pv.variant_id;
  DELETE p FROM products p
    JOIN ss_dummy_products_to_delete dp ON dp.product_id = p.product_id
    WHERE p.status = 'ARCHIVED';

  COMMIT;
  SELECT remove_count AS demo_products_removed,
         'Real catalogue and order history preserved' AS result;
END$$
DELIMITER ;

CALL ss_delete_original_demo_products();
DROP PROCEDURE IF EXISTS ss_delete_original_demo_products;

-- Verification: should show real products and no original demo products.
SELECT public_id, name, status FROM products ORDER BY status, name;
SELECT COUNT(*) AS remaining_demo_variants FROM product_variants pv
  JOIN products p ON p.product_id = pv.product_id
  WHERE p.public_id IN (
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
    'tshirt-01', 'baggy-01',
    'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
    'hoodie-01', 'SS-13E625D527741'
  );
DROP TEMPORARY TABLE IF EXISTS ss_dummy_variants_to_delete;
DROP TEMPORARY TABLE IF EXISTS ss_dummy_products_to_delete;
