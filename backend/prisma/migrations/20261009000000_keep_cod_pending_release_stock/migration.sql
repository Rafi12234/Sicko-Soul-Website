-- Forward-compatible, additive migration: never automatically reject valid pending COD orders.
-- NULL means the order's initial inventory reservation is still held (if pending).
-- A timestamp means the hold was released, but staff can still confirm after
-- checking current stock availability and re-reserving it atomically.
ALTER TABLE orders
  ADD COLUMN reservation_released_at DATETIME NULL DEFAULT NULL,
  ADD INDEX idx_orders_pending_hold (order_status, reservation_released_at, created_at);
