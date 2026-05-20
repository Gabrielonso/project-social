import { UserDisplay, UserDisplayDto } from '../types/user-display.types';

export function resolveUserDisplay(
  map: Map<string, UserDisplay>,
  userId?: string | null,
): UserDisplayDto | undefined {
  if (!userId) return undefined;

  const hit = map.get(userId);
  if (!hit) {
    return { id: userId, username: 'unknown' };
  }

  return {
    id: hit.userId,
    username: hit.username,
    ...(hit.profilePicture ? { profilePicture: hit.profilePicture } : {}),
  };
}

export function collectUserIds(
  ...groups: Array<Array<string | null | undefined>>
): string[] {
  return [
    ...new Set(
      groups.flat().filter((id): id is string => typeof id === 'string' && !!id),
    ),
  ];
}

/** Strip legacy snapshot keys that may still exist in Redis feed cache payloads. */
export function stripLegacyOwnerFields<T extends Record<string, unknown>>(
  entity: T,
): Omit<T, 'ownerUsername' | 'ownerAvatar'> {
  const {
    ownerUsername: _ownerUsername,
    ownerAvatar: _ownerAvatar,
    ...rest
  } = entity;
  return rest as Omit<T, 'ownerUsername' | 'ownerAvatar'>;
}
