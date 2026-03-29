/**
 * Shared utility for generating 1-bit alpha masks from HTMLImageElement.
 * Used by CapitalShip and Boss components that store raw images instead of Sprite objects.
 */

const _maskCanvas = document.createElement('canvas');
const _maskCtx = _maskCanvas.getContext('2d')!;

/** Generate a 1-bit alpha mask from an image. Returns null if image has no dimensions. */
export function generateImageMask(img: HTMLImageElement): Uint8Array | null {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w === 0 || h === 0) return null;

    _maskCanvas.width = w;
    _maskCanvas.height = h;
    _maskCtx.clearRect(0, 0, w, h);
    _maskCtx.drawImage(img, 0, 0);
    const data = _maskCtx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
        mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    }
    return mask;
}
