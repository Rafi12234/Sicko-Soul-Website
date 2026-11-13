-- SICKO SOUL: one-time manual schema update for the new ON_HOLD status.
-- MySQL 8 / MariaDB compatible. Run ONCE in MySQL Workbench on a BACKUP of your
-- actual local backend database first. This is NOT a Prisma migration.
-- Does NOT modify any existing order rows or deduct/reserve inventory.
-- Check DATABASE_NAME in backend/.env and select the same schema in Workbench.
-- DO NOT rerun after successful execution: the new columns will already exist.

SELECT DATABASE() AS selected_database;

-- This preserves ALL existing order status values while adding ON_HOLD.
ALTER TABLE `orders`
  MODIFY COLUMN `order_status` ENUM(
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
    'RETURNED',
    'OUT_OF_STOCK',
    'ON_HOLD'
  ) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  ADD COLUMN `hold_expected_restock_at` DATE NULL AFTER `order_status`,
  ADD COLUMN `hold_customer_wait_until` DATE NULL AFTER `hold_expected_restock_at`;

-- This preserves ALL existing email event values and adds the hold notification.
ALTER TABLE `email_outbox`
  MODIFY COLUMN `event_type` ENUM(
    'CUSTOMER_ACCESS',
    'ORDER_RECEIVED',
    'ORDER_CONFIRMED',
    'ORDER_SHIPPED',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    'COMPLAINT_REPLY',
    'ORDER_OUT_OF_STOCK',
    'ORDER_ON_HOLD'
  ) NOT NULL;

-- Verify both alterations before restarting your app.
SHOW COLUMNS FROM `orders` WHERE Field IN ('order_status', 'hold_expected_restock_at', 'hold_customer_wait_until');
SHOW COLUMNS FROM `email_outbox` WHERE Field = 'event_type';
SELECT order_status, COUNT(*) AS order_count FROM orders GROUP BY order_status;
