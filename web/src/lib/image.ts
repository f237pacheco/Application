// Resizes an image to fit within maxDim x maxDim (preserving aspect ratio)
// and re-encodes it, so even a large phone photo uploads quickly. Keeps the
// original format for png/webp (to preserve transparency), otherwise re-encodes
// as jpeg.
export async function compressImage(file: File, maxDim = 1600, quality = 0.92): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('La compression a échoué'))),
      outputType,
      outputType === 'image/png' ? undefined : quality
    );
  });
}

// Center-crops an image to a square and resizes it to `size`x`size` — the
// Instagram-style gallery grid needs uniform square thumbnails regardless of
// the source photo's aspect ratio, instead of letterboxing or stretching it.
export async function cropSquareImage(file: File, size = 640, quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

  const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Le recadrage a échoué'))),
      outputType,
      outputType === 'image/png' ? undefined : quality
    );
  });
}

export function extensionForMimeType(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
