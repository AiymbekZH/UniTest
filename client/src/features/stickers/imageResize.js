/**
 * Client-side image processing helpers for sticker upload.
 *
 * Server cap is 512 KB raw. Most user-uploaded PNGs from phone cameras
 * are 2-5 MB which would 400 the server. We resize down to 512×512 max
 * (sticker dimensions) and re-encode, ratcheting quality down if still
 * too large. Done before upload so the user gets feedback fast and we
 * don't waste bandwidth on rejects.
 */

const MAX_DIM = 512;
const MAX_BYTES = 512 * 1024;

/**
 * Read a File or Blob and return an HTMLImageElement loaded from it.
 * Cleans up the object URL once load resolves.
 */
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function approxBytesFromDataUrl(dataUrl) {
  const idx = dataUrl.indexOf(',');
  const body = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.floor(body.length * 0.75);
}

/**
 * Convert a File/Blob to a sticker-safe data URL.
 *
 *   1. Decode → fit into MAX_DIM box preserving aspect ratio.
 *   2. Re-encode as WebP at q=0.92, falling back to PNG if WebP fails.
 *   3. If output is still over MAX_BYTES, drop quality in 0.1 steps.
 *
 * Returns: { dataUrl, mimetype, bytes } or throws on hard failure.
 */
export async function processStickerImage(blob) {
  const img = await loadImage(blob);

  const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Draw with smoothing for the down-scale.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  // Try WebP first (smaller, usually transparent-friendly), fall back
  // to PNG if the browser refuses (very old Safari).
  let mimetype = 'image/webp';
  let dataUrl = canvas.toDataURL(mimetype, 0.92);
  if (!dataUrl.startsWith('data:image/webp')) {
    mimetype = 'image/png';
    dataUrl = canvas.toDataURL('image/png');
  }

  // PNG is lossless — if it's over the cap we have to drop down to
  // WebP-with-quality. If we already started with WebP we just lower q.
  const ratchet = [0.85, 0.75, 0.65, 0.55];
  for (const q of ratchet) {
    if (approxBytesFromDataUrl(dataUrl) <= MAX_BYTES) break;
    mimetype = 'image/webp';
    dataUrl = canvas.toDataURL('image/webp', q);
  }

  const bytes = approxBytesFromDataUrl(dataUrl);
  if (bytes > MAX_BYTES) {
    throw new Error('Картинка слишком большая даже после сжатия. Используйте картинку поменьше.');
  }

  return { dataUrl, mimetype, bytes };
}
