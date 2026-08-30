import type { Request } from 'express';

export type UserRole = 'user' | 'admin';

/**
 * Which product a Rewardtym admin may open. Rewardtym owns this value and puts
 * it on the token; Coinzu only reads it. Three cases, no read-only level —
 * whoever has access here has full write access.
 */
export type ProductAccess = 'both' | 'rewardtym' | 'coinzu';

/**
 * Caller identity built from the JWT alone — no database read.
 * App users get a Coinzu-signed token; admins reuse their Rewardtym token.
 */
export interface RequestUser {
  cz_user_id: string;
  email: string;
  role: UserRole;
  /** Rewardtym role name, present only for admins. */
  admin_role?: string;
  /** Rewardtym product access, present only for admins. */
  product_access?: ProductAccess;
}

/** Claims Coinzu signs for an app user. */
export interface CoinzuUserClaims {
  cz_user_id: string;
  email: string;
  role: 'user';
}

/** Claims a Rewardtym admin token carries. */
export interface RewardtymAdminClaims {
  type: 'admin';
  sub: string;
  email: string;
  role: string;
  is_active?: boolean;
  /** Missing on tokens Rewardtym issued before product access existed. */
  product_access?: ProductAccess;
}

export type AuthenticatedRequest = Request & { user?: RequestUser };
