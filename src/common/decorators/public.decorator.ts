import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'czIsPublic';

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
