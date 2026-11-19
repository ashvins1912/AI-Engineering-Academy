# Identity token contract

The API validates JWT signatures against ACADEMY_JWT_PUBLIC_KEY and validates issuer, audience, expiration and issued-at claims. The token must carry:

- sub: UUID user ID
- tenant_id: UUID tenant ID issued by the trusted identity provider
- roles: optional array; tenant_admin grants tenant-wide document deletion and tenant-health visibility.

Do not accept tenant IDs from request bodies, query parameters or custom headers. Never mint this token from the browser. Configure a trusted issuer and public key; asymmetric RS256 is the default. Production integration should map issuer claims from the actual identity provider and rotate keys using a JWKS cache.
