-- Shared fixed-window API rate-limit counters. Client IPs are never stored.
CREATE TABLE IF NOT EXISTS api_rate_limit_buckets (
  client_key char(64) NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (client_key, window_start)
);
CREATE INDEX IF NOT EXISTS ix_api_rate_limit_buckets_expiry
  ON api_rate_limit_buckets(expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limit_buckets TO academy_app;
