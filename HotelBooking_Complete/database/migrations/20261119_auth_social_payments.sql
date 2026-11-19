-- Upgrade an existing VNHotel database created with the earlier schema.
-- Do NOT run this file after importing the updated schema.sql (columns already exist).
USE hotel_booking;

ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN email_verification_token_hash CHAR(64) NULL AFTER email_verified,
  ADD COLUMN email_verification_expires DATETIME NULL AFTER email_verification_token_hash,
  ADD COLUMN auth_provider ENUM('local','google','apple') NOT NULL DEFAULT 'local' AFTER email_verification_expires,
  ADD COLUMN provider_subject VARCHAR(255) NULL AFTER auth_provider,
  ADD UNIQUE KEY uq_users_provider_subject (auth_provider, provider_subject),
  ADD KEY ix_users_verification (email_verification_token_hash, email_verification_expires);

-- Existing accounts from the previous version are treated as already verified.
UPDATE users SET email_verified = 1 WHERE email IS NOT NULL;

ALTER TABLE payments
  ADD COLUMN provider VARCHAR(30) NOT NULL DEFAULT 'manual' AFTER transaction_code,
  ADD COLUMN gateway_order_id VARCHAR(120) NULL AFTER provider,
  ADD COLUMN gateway_payload JSON NULL AFTER gateway_order_id,
  ADD UNIQUE KEY uq_payments_gateway_order (provider, gateway_order_id);


CREATE TABLE oauth_login_challenges (
  challenge_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider ENUM('google','apple') NOT NULL,
  nonce_hash CHAR(64) NOT NULL,
  csrf_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (challenge_id),
  UNIQUE KEY uq_oauth_challenge (provider, nonce_hash),
  KEY ix_oauth_challenge_expiry (expires_at)
) ENGINE=InnoDB;
