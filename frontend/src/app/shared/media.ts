/** Pictures are shrunk to this many pixels on the long edge before upload, to stay light. */
export const MAX_IMAGE_EDGE = 960;
/** Must match the limits on the server. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');

/** The size to draw a `width` × `height` picture at so its long edge is at most `max`. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export interface PreparedMedia {
  blob: Blob;
  type: 'IMAGE' | 'VIDEO';
}

/** Why a file can't be used, or null when it can. */
export function mediaProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_VIDEO_BYTES
      ? `Clips can be up to ${MAX_VIDEO_BYTES >> 20} MB. Try a shorter one.`
      : null;
  }
  if (IMAGE_TYPES.includes(file.type)) return null;
  return 'Use a JPEG, PNG or WebP picture, or an MP4 or WebM clip.';
}

/**
 * Gets a chosen file ready to send. Pictures are scaled down and saved as JPEG (a phone photo
 * of several megabytes becomes about 100 KB); clips are sent as they are, within the size limit.
 */
export async function prepareMedia(file: File): Promise<PreparedMedia> {
  const problem = mediaProblem(file);
  if (problem) throw new Error(problem);
  if (VIDEO_TYPES.includes(file.type)) return { blob: file, type: 'VIDEO' };
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    );
    if (blob) return { blob, type: 'IMAGE' };
  } catch {
    // Fall through: send the original if it is small enough.
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Pictures can be up to ${MAX_IMAGE_BYTES >> 20} MB.`);
  }
  return { blob: file, type: 'IMAGE' };
}
