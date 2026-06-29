const CLOUDINARY_HOST = 'res.cloudinary.com';
const TRANSFORMATION_SEGMENT = /^[a-z0-9]{1,3}_[^/]+$/i;

export function isCloudinaryDeliveryUrl(value: string): boolean {
  try {
    return new URL(value).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

/**
 * Resolves a Cloudinary public_id from a delivery URL or a stored public_id value.
 */
export function extractCloudinaryPublicId(value: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!isCloudinaryDeliveryUrl(trimmed)) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return null;
    }

    return stripFileExtension(trimmed);
  }

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(
      /\/(?:image|video|raw)\/(?:upload|authenticated|private)\/(.*)$/,
    );
    if (!match?.[1]) {
      return null;
    }

    const segments = match[1].split('/').filter(Boolean);
    const publicIdSegments: string[] = [];

    for (const segment of segments) {
      if (/^v\d+$/.test(segment)) {
        publicIdSegments.length = 0;
        continue;
      }

      if (TRANSFORMATION_SEGMENT.test(segment) || segment.includes(',')) {
        continue;
      }

      publicIdSegments.push(segment);
    }

    if (publicIdSegments.length === 0) {
      return null;
    }

    return stripFileExtension(publicIdSegments.join('/'));
  } catch {
    return null;
  }
}

export function resolveCloudinaryPublicId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const publicId = extractCloudinaryPublicId(candidate);
    if (publicId) {
      return publicId;
    }
  }

  return null;
}

function stripFileExtension(value: string): string {
  const lastSlash = value.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? value.slice(lastSlash + 1) : value;
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex <= 0) {
    return value;
  }

  return value.slice(0, value.length - (fileName.length - dotIndex));
}
