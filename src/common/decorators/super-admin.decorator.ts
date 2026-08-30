import { SetMetadata } from '@nestjs/common';

export const SUPER_ADMIN_KEY = 'czSuperAdmin';

/**
 * Narrows an admin route to Rewardtym super admins. Use it for decisions that
 * move money or change a user's standing, not for read-only screens.
 */
export const SuperAdmin = () => SetMetadata(SUPER_ADMIN_KEY, true);
