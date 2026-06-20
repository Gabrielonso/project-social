const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
};

export function extensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  if (MIME_TO_EXT[normalized]) {
    return MIME_TO_EXT[normalized];
  }
  const subtype = normalized.split('/')[1];
  return subtype?.replace(/[^a-z0-9]/gi, '') || 'bin';
}
