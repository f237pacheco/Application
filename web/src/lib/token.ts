import { randomBytes } from 'crypto';

// 32 bytes of cryptographic randomness, hex-encoded (64 chars) — used as the
// unguessable per-booking token that lets a client manage (view/cancel/
// reschedule) their own booking without an account, via a link mailed only
// to them. Never derived from the booking id or any other guessable value.
export function generateManageToken(): string {
  return randomBytes(32).toString('hex');
}
