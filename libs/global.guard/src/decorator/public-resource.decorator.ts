import { SetMetadata } from '@nestjs/common';

// method decorator for use when the class is protected but the method shouldn't be
export const META_PUBLIC_RESOURCE = 'is_public_resource';
export const PublicResource = () => SetMetadata(META_PUBLIC_RESOURCE, true);
