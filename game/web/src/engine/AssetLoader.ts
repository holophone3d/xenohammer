/**
 * Promise-based batch loading of images, sounds, and music.
 * Tracks progress for loading screens.
 */
import type { AudioManager } from './Audio';

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

    /** Register N upcoming loads so getProgress() includes them. */
    addPending(count: number): void {
        this.totalCount += count;
    }

    /** Mark one pending load as complete. */
    markLoaded(): void {
        this.loadedCount++;
    }

    /**
     * Load a sequence of numbered sprite frames.
     * Files are expected as: `${basePath}/${prefix}00.webp`, `${prefix}01.webp`, etc.
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
            const url = `${basePath}/${prefix}${num}.webp`;
            promises.push(this.loadImage(id, url));
        }
        return Promise.all(promises);
    }

    /**
     * Load a manifest.json and batch-load all asset entries.
     * Manifest format: {
     *   "graphics": { "id": "path/to/file.webp", ... },
     *   "sounds":   { "id": "path/to/file.mp3", ... },
     *   "music":    { "id": "path/to/file.mp3", ... }
     * }
     */
    async loadManifest(manifestUrl: string, basePath: string, audio?: AudioManager): Promise<void> {
        const response = await fetch(manifestUrl);
        const manifest = await response.json();

        const promises: Promise<unknown>[] = [];

        if (manifest.graphics && typeof manifest.graphics === 'object') {
            const entries: Array<{ id: string; url: string }> = [];
            for (const [id, file] of Object.entries(manifest.graphics)) {
                entries.push({ id, url: `${basePath}/${file}` });
            }
            promises.push(this.loadImages(entries));
        }

        if (audio && manifest.sounds && typeof manifest.sounds === 'object') {
            for (const [id, file] of Object.entries(manifest.sounds)) {
                this.totalCount++;
                promises.push(
                    audio.loadSound(id, `${basePath}/${file}`).finally(() => { this.loadedCount++; })
                );
            }
        }

        if (audio && manifest.music && typeof manifest.music === 'object') {
            for (const [id, file] of Object.entries(manifest.music)) {
                this.totalCount++;
                promises.push(
                    audio.loadMusic(id, `${basePath}/${file}`).finally(() => { this.loadedCount++; })
                );
            }
        }

        await Promise.all(promises);
    }
}
