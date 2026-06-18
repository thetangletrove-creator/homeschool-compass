-- ZK Architecture: encrypted_profile column for provider_invoices
-- Stores RSA-OAEP+AES-GCM hybrid encrypted blob of sensitive provider fields
-- (credentials, phone, email, cert file). Server holds only opaque ciphertext.
-- Rollback: ALTER TABLE provider_invoices DROP COLUMN encrypted_profile;

ALTER TABLE provider_invoices
ADD COLUMN encrypted_profile text;