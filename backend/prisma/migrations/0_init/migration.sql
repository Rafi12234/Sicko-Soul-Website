-- =====================================================================
-- SICKO SOUL - PRISMA BASELINE 0_init
-- Derived from the existing production schema supplied for this project.
--
-- IMPORTANT:
-- - This baseline intentionally does NOT DROP or CREATE the database.
-- - It preserves the existing MySQL table definitions exactly, including
--   ON UPDATE CURRENT_TIMESTAMP behavior, native ENUMs, foreign keys,
--   indexes, utf8mb4 table collations, and required reference data.
-- - On the already-existing local database, DO NOT execute this file.
--   Mark it as already applied with:
--       npx prisma migrate resolve --applied 0_init
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE staff_users (
    staff_user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM(
        'SUPER_ADMIN',
        'ADMIN',
        'ORDER_MANAGER',
        'INVENTORY_MANAGER',
        'SUPPORT'
    ) NOT NULL DEFAULT 'ADMIN',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (staff_user_id),
    UNIQUE KEY uq_staff_users_email (email),
    KEY idx_staff_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 2. CUSTOMERS
-- Customer account/login is not required.
-- Email is required because order confirmation email is required.
-- =====================================================================

CREATE TABLE customers (
    customer_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    status ENUM('ACTIVE', 'BLOCKED', 'ARCHIVED')
        NOT NULL DEFAULT 'ACTIVE',
    first_order_at DATETIME NULL,
    last_order_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (customer_id),
    UNIQUE KEY uq_customers_email (email),
    KEY idx_customers_phone (phone),
    KEY idx_customers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE customer_addresses (
    address_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(50) NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(32) NOT NULL,
    address_line VARCHAR(500) NOT NULL,
    city VARCHAR(120) NOT NULL,
    district VARCHAR(120) NOT NULL,
    postal_code VARCHAR(30) NULL,
    landmark VARCHAR(255) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (address_id),
    KEY idx_customer_addresses_customer (customer_id),

    CONSTRAINT fk_customer_addresses_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 3. PRODUCT CATALOG
-- =====================================================================

CREATE TABLE product_categories (
    category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    index_code VARCHAR(20) NULL,
    name VARCHAR(120) NOT NULL,
    ghost_name VARCHAR(120) NULL,
    spec VARCHAR(255) NULL,
    tagline VARCHAR(255) NULL,
    registry VARCHAR(255) NULL,
    cover_url VARCHAR(1000) NULL,
    cover_alt VARCHAR(255) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (category_id),
    UNIQUE KEY uq_product_categories_code (code),
    UNIQUE KEY uq_product_categories_slug (slug),
    KEY idx_product_categories_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE products (
    product_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NOT NULL,
    public_id VARCHAR(64) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    index_code VARCHAR(20) NULL,
    sku_base VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    spec VARCHAR(255) NULL,
    tagline VARCHAR(255) NULL,
    description TEXT NULL,
    status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED')
        NOT NULL DEFAULT 'DRAFT',
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (product_id),
    UNIQUE KEY uq_products_public_id (public_id),
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku_base (sku_base),
    KEY idx_products_category_status (category_id, status),
    KEY idx_products_status_created (status, created_at),

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES product_categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_images (
    image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    image_type ENUM('STILL', 'WORN', 'GALLERY', 'OTHER')
        NOT NULL DEFAULT 'GALLERY',
    image_url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (image_id),
    KEY idx_product_images_product_sort (product_id, sort_order),

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_features (
    feature_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    feature_text VARCHAR(255) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (feature_id),
    KEY idx_product_features_product_sort (product_id, sort_order),

    CONSTRAINT fk_product_features_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE sizes (
    size_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(20) NOT NULL,
    label VARCHAR(50) NOT NULL,
    size_group ENUM('TOP', 'PANT', 'GENERAL')
        NOT NULL DEFAULT 'GENERAL',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    PRIMARY KEY (size_id),
    UNIQUE KEY uq_sizes_code_group (code, size_group),
    KEY idx_sizes_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_variants (
    variant_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    size_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(100) NOT NULL,
    price_override DECIMAL(12,2) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')
        NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (variant_id),
    UNIQUE KEY uq_product_variants_product_size (product_id, size_id),
    UNIQUE KEY uq_product_variants_sku (sku),
    KEY idx_product_variants_product_status (product_id, status),

    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_product_variants_size
        FOREIGN KEY (size_id)
        REFERENCES sizes(size_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 4. DROP / VAULT COLLECTIONS
-- =====================================================================

CREATE TABLE collections (
    collection_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(160) NOT NULL,
    tagline VARCHAR(255) NULL,
    release_year SMALLINT UNSIGNED NULL,
    status ENUM('DRAFT', 'SCHEDULED', 'LIVE', 'SEALED', 'ARCHIVED')
        NOT NULL DEFAULT 'DRAFT',
    opens_at DATETIME NULL,
    closes_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (collection_id),
    UNIQUE KEY uq_collections_code (code),
    UNIQUE KEY uq_collections_slug (slug),
    KEY idx_collections_status_dates (status, opens_at, closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE collection_products (
    collection_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_sealed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (collection_id, product_id),
    KEY idx_collection_products_product (product_id),

    CONSTRAINT fk_collection_products_collection
        FOREIGN KEY (collection_id)
        REFERENCES collections(collection_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_collection_products_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 5. INVENTORY
-- Backend must update inventory_stock and inventory_movements
-- inside the same transaction.
-- =====================================================================

CREATE TABLE inventory_stock (
    variant_id BIGINT UNSIGNED NOT NULL,
    on_hand_qty INT UNSIGNED NOT NULL DEFAULT 0,
    reserved_qty INT UNSIGNED NOT NULL DEFAULT 0,
    reorder_level INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (variant_id),

    CONSTRAINT fk_inventory_stock_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(variant_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE inventory_movements (
    movement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    variant_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM(
        'INITIAL',
        'RESTOCK',
        'RESERVE',
        'RELEASE',
        'SALE',
        'RETURN',
        'ADJUSTMENT'
    ) NOT NULL,
    on_hand_delta INT NOT NULL DEFAULT 0,
    reserved_delta INT NOT NULL DEFAULT 0,
    reference_type ENUM(
        'ORDER',
        'CART',
        'PURCHASE',
        'RETURN',
        'MANUAL',
        'SYSTEM'
    ) NOT NULL DEFAULT 'SYSTEM',
    reference_id BIGINT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    created_by_staff_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (movement_id),
    KEY idx_inventory_movements_variant_date (variant_id, created_at),
    KEY idx_inventory_movements_reference (reference_type, reference_id),
    KEY idx_inventory_movements_staff (created_by_staff_id),

    CONSTRAINT fk_inventory_movements_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(variant_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_inventory_movements_staff
        FOREIGN KEY (created_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 6. CART
-- =====================================================================

CREATE TABLE carts (
    cart_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cart_token CHAR(36) NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    status ENUM('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED')
        NOT NULL DEFAULT 'ACTIVE',
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (cart_id),
    UNIQUE KEY uq_carts_token (cart_token),
    KEY idx_carts_customer_status (customer_id, status),
    KEY idx_carts_status_expiry (status, expires_at),

    CONSTRAINT fk_carts_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE cart_items (
    cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cart_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    price_when_added DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uq_cart_items_cart_variant (cart_id, variant_id),
    KEY idx_cart_items_variant (variant_id),

    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id)
        REFERENCES carts(cart_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_items_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(variant_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 7. ORDERS
-- Amounts and snapshots must be calculated/written by the backend.
-- =====================================================================

CREATE TABLE orders (
    order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_reference VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,

    customer_id BIGINT UNSIGNED NOT NULL,
    shipping_address_id BIGINT UNSIGNED NULL,
    source_cart_id BIGINT UNSIGNED NULL,
    source ENUM('CART', 'BUY_NOW') NOT NULL,

    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,

    shipping_address VARCHAR(500) NOT NULL,
    shipping_city VARCHAR(120) NOT NULL,
    shipping_district VARCHAR(120) NOT NULL,
    shipping_postal_code VARCHAR(30) NULL,
    shipping_landmark VARCHAR(255) NULL,

    order_note TEXT NULL,

    payment_method ENUM(
        'COD',
        'MANUAL',
        'MOBILE_FINANCIAL_SERVICE',
        'BANK_TRANSFER',
        'CARD'
    ) NOT NULL DEFAULT 'COD',

    subtotal DECIMAL(12,2) NOT NULL,
    delivery_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'BDT',

    order_status ENUM(
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REJECTED',
        'RETURNED'
    ) NOT NULL DEFAULT 'PENDING_CONFIRMATION',

    payment_status ENUM(
        'UNPAID',
        'PENDING',
        'PAID',
        'FAILED',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'UNPAID',

    confirmed_by_staff_id BIGINT UNSIGNED NULL,
    last_status_changed_by_staff_id BIGINT UNSIGNED NULL,

    confirmed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    cancellation_reason VARCHAR(500) NULL,

    placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (order_id),
    UNIQUE KEY uq_orders_reference (order_reference),
    UNIQUE KEY uq_orders_idempotency (idempotency_key),
    UNIQUE KEY uq_orders_source_cart (source_cart_id),

    KEY idx_orders_customer_date (customer_id, created_at),
    KEY idx_orders_status_date (order_status, created_at),
    KEY idx_orders_payment_status (payment_status, created_at),
    KEY idx_orders_phone (customer_phone),
    KEY idx_orders_email (customer_email),

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_shipping_address
        FOREIGN KEY (shipping_address_id)
        REFERENCES customer_addresses(address_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_orders_source_cart
        FOREIGN KEY (source_cart_id)
        REFERENCES carts(cart_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_orders_confirmed_staff
        FOREIGN KEY (confirmed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_orders_last_status_staff
        FOREIGN KEY (last_status_changed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE order_items (
    order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NULL,

    product_public_id_snapshot VARCHAR(64) NOT NULL,
    sku_snapshot VARCHAR(100) NOT NULL,
    product_name_snapshot VARCHAR(160) NOT NULL,
    size_snapshot VARCHAR(50) NOT NULL,
    image_url_snapshot VARCHAR(1000) NULL,

    unit_price DECIMAL(12,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (order_item_id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    KEY idx_order_items_variant (variant_id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(variant_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE order_status_history (
    history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(40) NULL,
    to_status VARCHAR(40) NOT NULL,
    changed_by_staff_id BIGINT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (history_id),
    KEY idx_order_status_history_order_date (order_id, changed_at),
    KEY idx_order_status_history_staff (changed_by_staff_id),

    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_order_status_history_staff
        FOREIGN KEY (changed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 8. PAYMENTS / REFUNDS
-- =====================================================================

CREATE TABLE payments (
    payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,

    method ENUM(
        'COD',
        'MANUAL',
        'MOBILE_FINANCIAL_SERVICE',
        'BANK_TRANSFER',
        'CARD'
    ) NOT NULL,

    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'BDT',

    status ENUM(
        'INITIATED',
        'PENDING',
        'PAID',
        'FAILED',
        'CANCELLED',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    provider VARCHAR(100) NULL,
    provider_reference VARCHAR(191) NULL,
    received_by_staff_id BIGINT UNSIGNED NULL,
    paid_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (payment_id),
    KEY idx_payments_order_status (order_id, status),
    KEY idx_payments_provider_reference (provider, provider_reference),

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_payments_staff
        FOREIGN KEY (received_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE refunds (
    refund_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    payment_id BIGINT UNSIGNED NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,

    status ENUM(
        'REQUESTED',
        'APPROVED',
        'PROCESSING',
        'COMPLETED',
        'REJECTED'
    ) NOT NULL DEFAULT 'REQUESTED',

    processed_by_staff_id BIGINT UNSIGNED NULL,
    processed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (refund_id),
    KEY idx_refunds_order_status (order_id, status),
    KEY idx_refunds_payment (payment_id),

    CONSTRAINT fk_refunds_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_refunds_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(payment_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_refunds_staff
        FOREIGN KEY (processed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 9. SHIPMENTS
-- =====================================================================

CREATE TABLE shipments (
    shipment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,

    courier_name VARCHAR(120) NULL,
    courier_service VARCHAR(120) NULL,
    tracking_code VARCHAR(191) NULL,

    status ENUM(
        'PENDING',
        'READY',
        'DISPATCHED',
        'IN_TRANSIT',
        'DELIVERED',
        'FAILED',
        'RETURNED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_status_changed_by_staff_id BIGINT UNSIGNED NULL,

    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (shipment_id),
    KEY idx_shipments_order_status (order_id, status),
    KEY idx_shipments_tracking (tracking_code),

    CONSTRAINT fk_shipments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_shipments_status_staff
        FOREIGN KEY (last_status_changed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE shipment_status_history (
    history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shipment_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(40) NULL,
    to_status VARCHAR(40) NOT NULL,
    note VARCHAR(500) NULL,
    changed_by_staff_id BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (history_id),
    KEY idx_shipment_history_shipment_date (shipment_id, changed_at),

    CONSTRAINT fk_shipment_history_shipment
        FOREIGN KEY (shipment_id)
        REFERENCES shipments(shipment_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_shipment_history_staff
        FOREIGN KEY (changed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 10. COMPLAINTS / SUPPORT
-- =====================================================================

CREATE TABLE complaint_categories (
    complaint_category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (complaint_category_id),
    UNIQUE KEY uq_complaint_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE complaints (
    complaint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    case_reference VARCHAR(32) NOT NULL,

    customer_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    complaint_category_id BIGINT UNSIGNED NOT NULL,

    contact_name VARCHAR(150) NULL,
    contact_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,

    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT')
        NOT NULL DEFAULT 'NORMAL',

    status ENUM(
        'OPEN',
        'IN_REVIEW',
        'WAITING_CUSTOMER',
        'RESOLVED',
        'CLOSED',
        'REJECTED'
    ) NOT NULL DEFAULT 'OPEN',

    assigned_to_staff_id BIGINT UNSIGNED NULL,
    closed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (complaint_id),
    UNIQUE KEY uq_complaints_case_reference (case_reference),

    KEY idx_complaints_customer (customer_id),
    KEY idx_complaints_order (order_id),
    KEY idx_complaints_status_priority (status, priority, created_at),
    KEY idx_complaints_assigned_staff (assigned_to_staff_id, status),

    CONSTRAINT fk_complaints_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_complaints_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_complaints_category
        FOREIGN KEY (complaint_category_id)
        REFERENCES complaint_categories(complaint_category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_complaints_assigned_staff
        FOREIGN KEY (assigned_to_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE complaint_messages (
    complaint_message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    complaint_id BIGINT UNSIGNED NOT NULL,

    sender_type ENUM('CUSTOMER', 'STAFF', 'SYSTEM') NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    staff_user_id BIGINT UNSIGNED NULL,

    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (complaint_message_id),
    KEY idx_complaint_messages_complaint_date (complaint_id, created_at),

    CONSTRAINT fk_complaint_messages_complaint
        FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_complaint_messages_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_complaint_messages_staff
        FOREIGN KEY (staff_user_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 11. PRODUCT REVIEWS / RATINGS
-- Business rule:
-- backend validates rating 1..5 and verifies purchases.
-- =====================================================================

CREATE TABLE product_reviews (
    review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    product_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    order_item_id BIGINT UNSIGNED NULL,

    reviewer_display_name VARCHAR(120) NOT NULL,
    reviewer_email VARCHAR(255) NOT NULL,

    rating TINYINT UNSIGNED NOT NULL,
    title VARCHAR(160) NULL,
    review_text TEXT NOT NULL,

    is_verified_purchase TINYINT(1) NOT NULL DEFAULT 0,

    status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'HIDDEN'
    ) NOT NULL DEFAULT 'PENDING',

    moderated_by_staff_id BIGINT UNSIGNED NULL,
    moderation_note VARCHAR(500) NULL,

    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (review_id),

    UNIQUE KEY uq_product_reviews_order_item (order_item_id),

    KEY idx_product_reviews_product_status_date
        (product_id, status, submitted_at),

    KEY idx_product_reviews_product_status_rating
        (product_id, status, rating),

    KEY idx_product_reviews_customer_date
        (customer_id, submitted_at),

    KEY idx_product_reviews_moderation
        (status, moderated_by_staff_id, submitted_at),

    CONSTRAINT fk_product_reviews_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_product_reviews_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_product_reviews_order_item
        FOREIGN KEY (order_item_id)
        REFERENCES order_items(order_item_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_product_reviews_moderator
        FOREIGN KEY (moderated_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_review_status_history (
    review_status_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    review_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NOT NULL,
    changed_by_staff_id BIGINT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (review_status_history_id),

    KEY idx_review_status_history_review_date (review_id, changed_at),
    KEY idx_review_status_history_staff (changed_by_staff_id, changed_at),

    CONSTRAINT fk_review_status_history_review
        FOREIGN KEY (review_id)
        REFERENCES product_reviews(review_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_review_status_history_staff
        FOREIGN KEY (changed_by_staff_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 12. EMAIL OUTBOX
-- Backend worker sends emails and updates status.
-- =====================================================================

CREATE TABLE email_outbox (
    email_outbox_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    dedupe_key VARCHAR(191) NOT NULL,

    event_type ENUM(
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
        'COMPLAINT_REPLY'
    ) NOT NULL,

    order_id BIGINT UNSIGNED NULL,
    complaint_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,

    recipient_name VARCHAR(150) NULL,
    recipient_email VARCHAR(255) NOT NULL,

    subject VARCHAR(255) NOT NULL,
    template_key VARCHAR(120) NOT NULL,

    -- Store JSON text generated by backend.
    payload LONGTEXT NOT NULL,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'SENT',
        'FAILED',
        'DEAD'
    ) NOT NULL DEFAULT 'PENDING',

    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 5,

    available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at DATETIME NULL,
    sent_at DATETIME NULL,

    last_error TEXT NULL,
    provider_message_id VARCHAR(191) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (email_outbox_id),
    UNIQUE KEY uq_email_outbox_dedupe (dedupe_key),

    KEY idx_email_outbox_worker (status, available_at, email_outbox_id),
    KEY idx_email_outbox_order (order_id),
    KEY idx_email_outbox_complaint (complaint_id),

    CONSTRAINT fk_email_outbox_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_email_outbox_complaint
        FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_email_outbox_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE email_delivery_events (
    email_delivery_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email_outbox_id BIGINT UNSIGNED NOT NULL,

    provider_event_id VARCHAR(191) NULL,
    event_type VARCHAR(40) NOT NULL,

    payload LONGTEXT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (email_delivery_event_id),
    UNIQUE KEY uq_email_delivery_provider_event (provider_event_id),
    KEY idx_email_delivery_outbox_date (email_outbox_id, occurred_at),

    CONSTRAINT fk_email_delivery_outbox
        FOREIGN KEY (email_outbox_id)
        REFERENCES email_outbox(email_outbox_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 13. ADMIN AUDIT LOG
-- =====================================================================

CREATE TABLE audit_logs (
    audit_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_user_id BIGINT UNSIGNED NULL,

    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,

    old_data LONGTEXT NULL,
    new_data LONGTEXT NULL,

    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (audit_log_id),

    KEY idx_audit_logs_staff_date (staff_user_id, created_at),
    KEY idx_audit_logs_entity (entity_type, entity_id, created_at),

    CONSTRAINT fk_audit_logs_staff
        FOREIGN KEY (staff_user_id)
        REFERENCES staff_users(staff_user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 14. BASIC REFERENCE DATA
-- =====================================================================

INSERT INTO sizes (code, label, size_group, sort_order, is_active) VALUES
('S',  'Small',       'TOP', 10, 1),
('M',  'Medium',      'TOP', 20, 1),
('L',  'Large',       'TOP', 30, 1),
('XL', 'Extra Large', 'TOP', 40, 1),
('28', '28',          'PANT', 10, 1),
('30', '30',          'PANT', 20, 1),
('32', '32',          'PANT', 30, 1),
('34', '34',          'PANT', 40, 1);


INSERT INTO complaint_categories (code, label, is_active, sort_order) VALUES
('defect',   'DEFECT',   1, 10),
('delivery', 'DELIVERY', 1, 20),
('sizing',   'SIZING',   1, 30),
('refund',   'REFUND',   1, 40),
('other',    'OTHER',    1, 50);
