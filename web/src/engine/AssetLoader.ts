/**
 * Promise-based batch loading of images (and sound via AudioManager).
 * Tracks progress for loading screens.
 */
export class AssetLoader {
    private images: Map<string, HTMLImageElement> = new Map();
    private loadedCount = 0;
    private totalCount = 0;

    constructor() {}

    /** Load a single image. Resolves when the image is ready. */
    loadImage(id: string, url: string): Promise<HTMLImageElement> {
        this.totalCount++;
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(id, img);
                this.loadedCount++;
                resolve(img);
            };
            img.onerror = () => {
                this.loadedCount++;
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }

    /** Load multiple images in parallel. */
    async loadImages(entries: Array<{ id: string; url: string }>): Promise<void> {
        await Promise.all(entries.map(e => this.loadImage(e.id, e.url)));
    }

    /** Retrieve a previously loaded image by its id. */
    getImage(id: string): HTMLImageElement {
        const img = this.images.get(id);
        if (!img) {
            throw new Error(`Image "${id}" not loaded`);
        }
        return img;
    }

    /** Check if an image has been loaded. */
    hasImage(id: string): boolean {
        return this.images.has(id);
    }

    /** Get an image without throwing, returns null if not loaded. */
    tryGetImage(id: string): HTMLImageElement | null {
        return this.images.get(id) ?? null;
    }

    /** Returns loading progress as a value from 0 to 1. */
    getProgress(): number {
        if (this.totalCount === 0) return 1;
        return this.loadedCount / this.totalCount;
    }

    /**
     * Load a sequence of numbered sprite frames.
     * Files are expected as: `${basePath}/${prefix}00.png`, `${prefix}01.png`, etc.
     * Each frame is also stored individually as "${prefix}XX" in the image map.
     */
    async loadSpriteFrames(
        prefix: string,
        basePath: string,
        count: number
    ): Promise<HTMLImageElement[]> {
        const promises: Promise<HTMLImageElement>[] = [];
        for (let i = 0; i < count; i++) {
            const num = i.toString().padStart(2, '0');
            const id = `${prefix}${num}`;
            const url = `${basePath}/${prefix}${num}.png`;
            promises.push(this.loadImage(id, url));
        }
        return Promise.all(promises);
    }

    /**
     * Load a manifest.json and batch-load all graphics entries.
     * Manifest format: { "graphics": { "assetId": "path/to/file.png", ... } }
     */
    async loadManifest(manifestUrl: string, basePath: string): Promise<void> {
        const response = await fetch(manifestUrl);
        const manifest = await response.json();
        if (manifest.graphics && typeof manifest.graphics === 'object') {
            const entries: Array<{ id: string; url: string }> = [];
            for (const [id, file] of Object.entries(manifest.graphics)) {
                entries.push({ id, url: `${basePath}/${file}` });
            }
            await this.loadImages(entries);
        }
    }
}
