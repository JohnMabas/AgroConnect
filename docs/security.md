# Security controls

Production requires strong JWT secrets and verified PostgreSQL TLS. Passwords use Argon2id; hashes and provider secrets are not returned. Auth/OTP routes are rate-limited, Zod validates input, CORS is allow-listed, and baseline security headers are emitted. Paystack webhooks verify the raw body and process events idempotently. Verification documents are private. AI is informational only and cannot execute marketplace or moderation actions.
