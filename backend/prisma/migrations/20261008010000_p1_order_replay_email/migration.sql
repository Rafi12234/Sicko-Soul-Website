-- Existing orders intentionally retain NULL fingerprint: an old key is not silently trusted.
ALTER TABLE `orders` ADD COLUMN `request_fingerprint` CHAR(64) NULL;
ALTER TABLE `email_outbox` MODIFY COLUMN `event_type` ENUM('CUSTOMER_ACCESS','ORDER_RECEIVED','ORDER_CONFIRMED','ORDER_SHIPPED','ORDER_DELIVERED','ORDER_CANCELLED','COMPLAINT_REPLY') NOT NULL;
