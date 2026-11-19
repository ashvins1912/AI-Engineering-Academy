# Identity token contract

The API accepts a trusted RS256 JWT and validates its signature, issuer, audience, expiry and issued-at time (30-second clock-skew allowance). Required claims:

- `sub`: UUID user ID
- `tenant_id`: UUID tenant ID issued by the trusted identity provider
- `iss`, `aud`, `exp`, `iat`: standard validated claims
- `roles`: optional array of role strings; `tenant_admin` grants tenant-wide document deletion and tenant-health visibility.

## Key configuration

Prefer `ACADEMY_JWKS_URL` pointing to the identity provider's HTTPS JWKS endpoint. The API caches the JWKS set for five minutes and refreshes when a token references an unknown key ID, allowing signing-key rotation. For providers without JWKS, configure `ACADEMY_JWT_PUBLIC_KEY` with a trusted RS256 PEM public key. Never accept a JWKS URL, issuer, audience, key, or algorithm from a request.

The verifier is pinned to RS256; symmetric HS256 tokens are rejected. Configure the issuer, audience and key source through deployment secrets/configuration. Do not enable the API until the actual Academy identity provider's claim mapping has been verified.

Do not accept tenant IDs from request bodies, query parameters or custom headers. Never mint this token from the browser. The frontend must obtain a short-lived access token from the trusted identity provider and send it as a bearer token. Tenant identity is derived exclusively from the signed `tenant_id` claim.
