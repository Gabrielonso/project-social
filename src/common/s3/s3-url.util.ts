import { awsConfig } from 'src/config/aws.config';

export function isS3DeliveryUrl(url: string): boolean {
  return extractS3ObjectKey(url) !== null;
}

export function extractS3ObjectKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathKey = parsed.pathname.replace(/^\/+/, '');
    if (!pathKey) {
      return null;
    }

    const cdnBaseUrl = awsConfig.s3.cdnBaseUrl?.replace(/\/$/, '');
    if (cdnBaseUrl) {
      const cdn = new URL(cdnBaseUrl);
      if (parsed.hostname === cdn.hostname) {
        return pathKey;
      }
    }

    const bucket = awsConfig.s3.bucket;
    if (!bucket) {
      return null;
    }

    if (parsed.hostname === `${bucket}.s3.amazonaws.com`) {
      return pathKey;
    }

    if (parsed.hostname.startsWith(`${bucket}.s3.`)) {
      return pathKey;
    }

    if (
      parsed.hostname.startsWith('s3.') &&
      parsed.hostname.includes('amazonaws.com')
    ) {
      const segments = pathKey.split('/');
      if (segments[0] === bucket && segments.length > 1) {
        return segments.slice(1).join('/');
      }
    }

    return null;
  } catch {
    return null;
  }
}
