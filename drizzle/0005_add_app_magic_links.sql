-- Phase B5b — App Magic Links (iPad activation)
-- Tokens that connect a web purchase to the iPad app activation.
-- Generated after a user buys via the website, emailed to them,
-- and validated when they open the link in the app.

CREATE TABLE IF NOT EXISTS app_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  -- The user's email (for display / matching to existing accounts)
  email text NOT NULL,
  -- The state they purchased access to, or '*' for all
  state_code text NOT NULL DEFAULT '*',
  -- What they purchased: 'compliance_kit' | 'binder_plus' | 'annual'
  purchase_type text NOT NULL,
  -- Stripe metadata for verification
  stripe_session_id text,
  stripe_customer_id text,
  -- Usage tracking
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  -- The user's actual ID if they created an account
  user_id text,
  -- Expiry
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_magic_links_token ON app_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_app_magic_links_email ON app_magic_links(email);

COMMENT ON TABLE app_magic_links IS 'Magic links for iPad app activation — generated from web purchase, validated in the app';
COMMENT ON COLUMN app_magic_links.token IS 'URL-safe random token';
COMMENT ON COLUMN app_magic_links.state_code IS 'Purchased state access, or * for all';
COMMENT ON COLUMN app_magic_links.purchase_type IS 'What was purchased: compliance_kit, binder_plus, or annual';
COMMENT ON COLUMN app_magic_links.user_id IS 'Linked user account after activation';
