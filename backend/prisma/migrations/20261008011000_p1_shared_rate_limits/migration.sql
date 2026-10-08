CREATE TABLE IF NOT EXISTS `api_rate_limit_buckets` (
  `bucket_key` CHAR(64) NOT NULL,
  `hits` INT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`bucket_key`),
  INDEX `idx_api_limit_expiry` (`expires_at`)
) ENGINE=InnoDB;
