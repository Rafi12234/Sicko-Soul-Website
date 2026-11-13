-- SICKO SOUL / REAL CATALOGUE / Workbench MySQL 8+, schema revision + Excel seed
-- SOURCE: 48 Cloudinary URLs, 8 products, 12 colour options, L/XL physical quantities.
-- IMPORTANT: BACK UP THE DATABASE FIRST. Apply this file to a local copy before production.
-- DDL ALTER TABLE statements commit automatically in MySQL; this file is a one-time upgrade.
-- Existing products are ARCHIVED (not hard-deleted) to preserve historical order FKs.
-- S/M/XXL get zero inventory: the frontend disables these sizes.
-- Re-running the seed is not recommended; on-hand stock is not reset on duplicate.

SET NAMES utf8mb4;

-- STEP 1: colour-aware columns and uniqueness (one-time schema upgrade).
ALTER TABLE product_variants ADD COLUMN color_code VARCHAR(32) NOT NULL DEFAULT 'BLACK' AFTER size_id;
ALTER TABLE product_variants DROP INDEX uq_product_variants_product_size, ADD UNIQUE KEY uq_product_variants_product_color_size (product_id, color_code, size_id);
ALTER TABLE product_images ADD COLUMN color_code VARCHAR(32) NOT NULL DEFAULT 'BLACK' AFTER image_type;
CREATE INDEX idx_product_images_product_color_sort ON product_images (product_id, color_code, sort_order);

-- STEP 2: seed actual products and archive old storefront listings.
START TRANSACTION;
INSERT INTO catalog_segments (code,slug,name,sort_order,is_active) VALUES ('SS_REAL_CLOTHING','ss-real-clothing','CLOTHING',0,1) ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=1;
SET @sicko_segment := (SELECT segment_id FROM catalog_segments WHERE code='SS_REAL_CLOTHING' LIMIT 1);
INSERT INTO product_categories (segment_id,code,slug,index_code,name,ghost_name,spec,tagline,registry,sort_order,is_active) VALUES (@sicko_segment,'SS_REAL_TEES','ss-real-tshirts','01','T-SHIRTS','TEES',NULL,NULL,'SICKO SOUL / REAL RELEASE',0,1) ON DUPLICATE KEY UPDATE segment_id=VALUES(segment_id),name=VALUES(name),is_active=1;
SET @sicko_category := (SELECT category_id FROM product_categories WHERE code='SS_REAL_TEES' LIMIT 1);
-- Archive former active products instead of deleting products referenced by order_items.
UPDATE products SET status='ARCHIVED',updated_at=NOW() WHERE status='ACTIVE' AND public_id NOT LIKE 'SS-REAL-%';

-- Keep standard clothing sizes visible, but unavailable sizes have zero stock.
INSERT INTO sizes (code,label,size_group,sort_order,is_active) VALUES ('S','S','TOP',10,1) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=1;
INSERT INTO sizes (code,label,size_group,sort_order,is_active) VALUES ('M','M','TOP',20,1) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=1;
INSERT INTO sizes (code,label,size_group,sort_order,is_active) VALUES ('L','L','TOP',30,1) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=1;
INSERT INTO sizes (code,label,size_group,sort_order,is_active) VALUES ('XL','XL','TOP',40,1) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=1;
INSERT INTO sizes (code,label,size_group,sort_order,is_active) VALUES ('XXL','XXL','TOP',50,1) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=1;

-- Product 01: Warrior
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-WARRIOR','warrior','01','SS-REAL-WARRIOR','Warrior',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-WARRIOR' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394880/warrior_front_t9i7fe.png','Warrior / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394875/warrior_back_fmfcf1.png','Warrior / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394868/warrior_F_lbk5nz.png','Warrior / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394859/warrior_B_v7rsou.png','Warrior / Black / Back on body',30);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-WARRIOR-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-WARRIOR-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-WARRIOR-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-WARRIOR-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-WARRIOR-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-WARRIOR-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,8,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',8,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 8>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-WARRIOR-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-WARRIOR-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,3,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',3,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 3>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-WARRIOR-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-WARRIOR-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 02: Ninja
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-NINJA','ninja','02','SS-REAL-NINJA','Ninja',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-NINJA' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394831/ninja_black_front_tyakmh.png','Ninja / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394827/ninja_black_back_kcp3iv.png','Ninja / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_black_F_bqktj6.png','Ninja / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394815/ninja_black_B_ipsaf9.png','Ninja / Black / Back on body',30);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_white_front_lac1cl.png','Ninja / White / Front',40);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394844/ninja_white_back_ydxmcv.png','Ninja / White / Back',50);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394843/ninja_white_F_yl70eg.png','Ninja / White / Front on body',60);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394841/ninja_white_B_abi0ka.png','Ninja / White / Back on body',70);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-NINJA-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-NINJA-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-NINJA-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,3,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',3,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 3>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-NINJA-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,5,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',5,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 5>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-NINJA-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-NINJA-WHITE-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-WHITE-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-NINJA-WHITE-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-WHITE-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-NINJA-WHITE-L',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-WHITE-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,3,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',3,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 3>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-NINJA-WHITE-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-WHITE-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-NINJA-WHITE-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-NINJA-WHITE-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 03: Iceman
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-ICEMAN','iceman','03','SS-REAL-ICEMAN','Iceman',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-ICEMAN' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394795/iceman_black_front_edgx06.png','Iceman / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394796/iceman_black_back_x1lpoy.png','Iceman / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394790/iceman_black_F_bio2go.png','Iceman / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394816/iceman_black_B_fd5w0f.png','Iceman / Black / Back on body',30);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394826/iceman_white_front_vlj3t0.png','Iceman / White / Front',40);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394817/iceman_white_back_siu1yv.png','Iceman / White / Back',50);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394813/iceman_white_F_rctbss.png','Iceman / White / Front on body',60);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394801/iceman_white_B_scmitn.png','Iceman / White / Back on body',70);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-ICEMAN-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-ICEMAN-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-ICEMAN-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,4,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',4,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 4>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-ICEMAN-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,6,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',6,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 6>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-ICEMAN-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-ICEMAN-WHITE-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-WHITE-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-ICEMAN-WHITE-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-WHITE-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-ICEMAN-WHITE-L',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-WHITE-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,4,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',4,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 4>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-ICEMAN-WHITE-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-WHITE-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,6,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',6,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 6>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-ICEMAN-WHITE-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-ICEMAN-WHITE-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 04: Horse Game
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-HORSE_GAME','horse-game','04','SS-REAL-HORSE_GAME','Horse Game',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-HORSE_GAME' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394789/horse_game_black_front_2_fvfkpj.png','Horse Game / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_back_1_dvwebt.png','Horse Game / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_F_nqxqsg.png','Horse Game / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394777/horse_game_black_B_xcixle.png','Horse Game / Black / Back on body',30);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-HORSE_GAME-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-HORSE_GAME-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-HORSE_GAME-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-HORSE_GAME-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-HORSE_GAME-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-HORSE_GAME-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,4,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',4,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 4>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-HORSE_GAME-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-HORSE_GAME-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,7,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',7,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 7>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-HORSE_GAME-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-HORSE_GAME-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 05: Sicko Bird
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-SICKO_BIRD','sicko-bird','05','SS-REAL-SICKO_BIRD','Sicko Bird',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-SICKO_BIRD' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394852/sicko_bird_black_front_adjnvn.png','Sicko Bird / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_black_back_u9myyv.png','Sicko Bird / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394868/sicko_bird_black_F_aeahai.png','Sicko Bird / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394851/sicko_bird_black_B_n8l9f7.png','Sicko Bird / Black / Back on body',30);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394867/sicko_bird_white_front_ijqnr6.png','Sicko Bird / White / Front',40);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_white_back_y3rgxl.png','Sicko Bird / White / Back',50);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394855/sicko_bird_white_F_owfewe.png','Sicko Bird / White / Front on body',60);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394856/sicko_bird_white_B_ysxrj6.png','Sicko Bird / White / Back on body',70);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-SICKO_BIRD-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-SICKO_BIRD-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-SICKO_BIRD-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,3,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',3,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 3>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-SICKO_BIRD-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,6,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',6,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 6>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-SICKO_BIRD-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-SICKO_BIRD-WHITE-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-WHITE-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-SICKO_BIRD-WHITE-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-WHITE-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-SICKO_BIRD-WHITE-L',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-WHITE-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,4,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',4,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 4>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-SICKO_BIRD-WHITE-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-WHITE-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,6,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',6,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 6>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-SICKO_BIRD-WHITE-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-SICKO_BIRD-WHITE-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 06: Return
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-RETURN','return','06','SS-REAL-RETURN','Return',950,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-RETURN' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394668/return_black_front_qn4tz2.png','Return / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394670/return_black_back_gkj3wx.png','Return / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394672/return_black_F_v5a0ck.png','Return / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394762/return_black_B_kdz9wf.png','Return / Black / Back on body',30);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-RETURN-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-RETURN-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-RETURN-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-RETURN-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-RETURN-BLACK-L',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-RETURN-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-RETURN-BLACK-XL',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-RETURN-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,7,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',7,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 7>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-RETURN-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-RETURN-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 07: DinoSoul
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-DINOSOUL','dinosoul','07','SS-REAL-DINOSOUL','DinoSoul',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-DINOSOUL' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394589/dinosoul_black_front_qum6xr.png','DinoSoul / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394575/dinosoul_black_back_swiv0d.png','DinoSoul / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394567/dinosoul_black_F_gvio4q.png','DinoSoul / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394553/dinosoul_black_B_zdmsri.png','DinoSoul / Black / Back on body',30);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394591/dinosoul_white_front_zn7yqg.png','DinoSoul / White / Front',40);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794398288/dinosoul_white_back_dgekuf.png','DinoSoul / White / Back',50);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394627/dinosoul_white_F_beo4cx.png','DinoSoul / White / Front on body',60);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','WHITE','https://res.cloudinary.com/dec82taov/image/upload/v1794394621/dinosoul_white_B_g2dx8e.png','DinoSoul / White / Back on body',70);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-DINOSOUL-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-DINOSOUL-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-DINOSOUL-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,8,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',8,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 8>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-DINOSOUL-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-DINOSOUL-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-DINOSOUL-WHITE-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-WHITE-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-DINOSOUL-WHITE-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-WHITE-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-DINOSOUL-WHITE-L',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-WHITE-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,2,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',2,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 2>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-DINOSOUL-WHITE-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-WHITE-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,4,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',4,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 4>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'WHITE','SS-REAL-DINOSOUL-WHITE-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-DINOSOUL-WHITE-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- Product 08: Gods Plan
INSERT INTO products (category_id,public_id,slug,index_code,sku_base,name,base_price,currency,spec,tagline,description,status,published_at,created_at,updated_at)
VALUES (@sicko_category,'SS-REAL-GODS_PLAN','gods-plan','08','SS-REAL-GODS_PLAN','Gods Plan',790,'BDT',NULL,NULL,NULL,'ACTIVE',NOW(),NOW(),NOW())
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),base_price=VALUES(base_price),status='ACTIVE',updated_at=NOW();
SET @sicko_product := (SELECT product_id FROM products WHERE public_id='SS-REAL-GODS_PLAN' LIMIT 1);
-- Gallery is replaced only for this real SKU, never for unrelated orders/products.
DELETE FROM product_images WHERE product_id=@sicko_product;
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'STILL','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_front_lysfiu.png','Gods Plan / Black / Front',0);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394764/gods_plan_black_back_kaiidv.png','Gods Plan / Black / Back',10);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'WORN','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_F_r3thm7.png','Gods Plan / Black / Front on body',20);
INSERT INTO product_images (product_id,image_type,color_code,image_url,alt_text,sort_order)
VALUES (@sicko_product,'GALLERY','BLACK','https://res.cloudinary.com/dec82taov/image/upload/v1794394769/gods_plan_black_B_o7jif4.png','Gods Plan / Black / Back on body',30);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-GODS_PLAN-BLACK-S',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='S' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-GODS_PLAN-BLACK-S' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-GODS_PLAN-BLACK-M',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='M' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-GODS_PLAN-BLACK-M' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-GODS_PLAN-BLACK-L',NULL,1,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='L' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-GODS_PLAN-BLACK-L' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,8,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',8,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 8>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-GODS_PLAN-BLACK-XL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-GODS_PLAN-BLACK-XL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);
INSERT INTO product_variants (product_id,size_id,color_code,sku,price_override,is_default,status,created_at,updated_at)
SELECT @sicko_product,s.size_id,'BLACK','SS-REAL-GODS_PLAN-BLACK-XXL',NULL,0,'ACTIVE',NOW(),NOW() FROM sizes s WHERE s.code='XXL' AND s.size_group='TOP'
ON DUPLICATE KEY UPDATE sku=VALUES(sku),status=VALUES(status),is_default=VALUES(is_default);
SET @sicko_variant := (SELECT variant_id FROM product_variants WHERE sku='SS-REAL-GODS_PLAN-BLACK-XXL' LIMIT 1);
INSERT INTO inventory_stock (variant_id,on_hand_qty,reserved_qty,reorder_level,updated_at) VALUES (@sicko_variant,0,0,0,NOW()) ON DUPLICATE KEY UPDATE variant_id=variant_id;
INSERT INTO inventory_movements (variant_id,movement_type,on_hand_delta,reserved_delta,reference_type,note,created_at)
SELECT @sicko_variant,'INITIAL',0,0,'SYSTEM','Real catalogue import / spreadsheet',NOW() WHERE 0>0 AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE variant_id=@sicko_variant);

-- STEP 3: Retire the two known demonstration drop collections, keep their order history.
UPDATE collections SET status='DRAFT',updated_at=NOW() WHERE slug IN ('black-file','first-offense');
-- Publish a real collection so /drops shows the same eight real products.
INSERT INTO collections (code,slug,name,tagline,release_year,status,created_at,updated_at)
VALUES ('SS_REAL_DROP','real-tshirt-release','THE REAL RELEASE','SICKO SOUL / ORIGINAL T-SHIRT FILES',2026,'LIVE',NOW(),NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name),tagline=VALUES(tagline),status='LIVE',updated_at=NOW();
SET @sicko_collection := (SELECT collection_id FROM collections WHERE code='SS_REAL_DROP' LIMIT 1);
INSERT INTO collection_products (collection_id,product_id,sort_order,is_sealed,created_at)
SELECT @sicko_collection,p.product_id,CAST(p.index_code AS UNSIGNED)*10,0,NOW()
FROM products p WHERE p.public_id LIKE 'SS-REAL-%' AND p.status='ACTIVE'
ON DUPLICATE KEY UPDATE sort_order=VALUES(sort_order),is_sealed=0;

COMMIT;

-- Verify imported products, variants and stock after execution:
SELECT p.public_id,p.name,p.base_price,v.color_code,s.code AS size,st.on_hand_qty FROM products p JOIN product_variants v ON v.product_id=p.product_id JOIN sizes s ON s.size_id=v.size_id JOIN inventory_stock st ON st.variant_id=v.variant_id WHERE p.public_id LIKE 'SS-REAL-%' ORDER BY p.name,v.color_code,s.sort_order;
SELECT p.name,pi.color_code,COUNT(*) AS image_count FROM products p JOIN product_images pi ON pi.product_id=p.product_id WHERE p.public_id LIKE 'SS-REAL-%' GROUP BY p.name,pi.color_code ORDER BY p.name,pi.color_code;
