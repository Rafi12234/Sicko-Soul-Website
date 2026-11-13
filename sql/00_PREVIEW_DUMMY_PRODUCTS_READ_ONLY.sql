-- SICKO SOUL / READ-ONLY preview — executes NO DELETE.
-- Run this FIRST in MySQL Workbench to confirm you selected the local database.
SELECT DATABASE() AS selected_database;

SELECT p.public_id, p.name, p.status,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.product_id) AS variant_count,
       (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) AS orders_using_this_product,
       (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.product_id) AS reviews_using_this_product
FROM products p
WHERE p.public_id IN (
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
    'tshirt-01', 'baggy-01',
    'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
    'hoodie-01', 'SS-13E625D527741'
)
ORDER BY p.public_id;

-- Any other archived products should be REVIEWED, not automatically deleted.
-- They may contain real historical catalogue records.
SELECT public_id, name, status
FROM products
WHERE status = 'ARCHIVED'
  AND public_id NOT IN (
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04',
    'tshirt-01', 'baggy-01',
    'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03', 'dropshoulder-04',
    'hoodie-01', 'SS-13E625D527741'
  )
ORDER BY name;
