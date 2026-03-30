/**
 * Shared utility for generating 1-bit alpha masks from HTMLImageElement.
 * Used by CapitalShip and Boss components that store raw images instead of Sprite objects.
 * Caches masks by image identity to avoid redundant GPU→CPU readbacks.
 */

const _maskCanvas = document.createElement('canvas');
const _maskCtx = _maskCanvas.getContext('2d')!;
const _maskCache = new WeakMap<HTMLImageElement, Uint8Array | null>();

/** Generate a 1-bit alpha mask from an image. Cached by image reference. */
export function generateImageMask(img: HTMLImageElement): Uint8Array | null {
    const cached = _maskCache.get(img);
    if (cached !== undefined) return cached;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w === 0 || h === 0) {
        _maskCache.set(img, null);
        return null;
    }

    _maskCanvas.width = w;
    _maskCanvas.height = h;
    _maskCtx.clearRect(0, 0, w, h);
    _maskCtx.drawImage(img, 0, 0);
    const data = _maskCtx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
        mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    }
    _maskCache.set(img, mask);
    return mask;
}
