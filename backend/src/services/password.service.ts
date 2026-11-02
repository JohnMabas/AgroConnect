import argon2 from "argon2";

// Argon2id parameters — conservative defaults that balance security and performance.
// OWASP recommends: m=19456 (19 MiB), t=2, p=1 for interactive workloads.
const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  raw: false,
};

// Minimum 8, maximum 128 characters. Prevents extremely short passwords and
// avoids DoS via extremely long inputs that consume hashing time.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return null; // valid
}

/**
 * Hash a plaintext password using Argon2id.
 * Returns the encoded hash string (includes salt and parameters).
 * Never log the return value.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 * Returns true if the password matches, false otherwise.
 * Safe against timing attacks via the argon2 library's constant-time comparison.
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Malformed hash or unexpected error — treat as mismatch.
    return false;
  }
}
