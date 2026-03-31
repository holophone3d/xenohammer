/**
 * Capture gameplay footage for the site hero background.
 * Uses Puppeteer + Chrome's MediaRecorder to record the game canvas as WebM.
 *
 * Prerequisites: vite dev server running at localhost:5173
 * Usage: node capture-hero.mjs
 * Output: ../../site/hero-gameplay.webm
 *
 * Instructions:
 *   1. Script opens the game and jumps to Level 1 with god mode
 *   2. YOU play the game — fly around, shoot enemies, look cool
 *   3. Recording starts automatically and lasts RECORD_SECONDS
 *   4. When done, the video saves and the browser closes
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:5174/';
const OUTPUT = path.resolve('..', '..', 'site', 'hero-gameplay.webm');
const RECORD_SECONDS = 30;
const PREP_SECONDS = 10;

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 800, height: 600 },
        args: ['--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error')
            console.log(`[${msg.type()}] ${msg.text()}`);
    });

    console.log('Navigating to game...');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for canvas
    await page.waitForFunction(() => {
        const c = document.querySelector('canvas');
        return c && c.width > 0;
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Click to advance past loading
    console.log('Advancing past loading screen...');
    await page.mouse.click(400, 300);
    await new Promise(r => setTimeout(r, 1000));
    await page.mouse.click(400, 300);
    await new Promise(r => setTimeout(r, 1500));

    // Open debug menu and jump to Level 1 with god mode
    console.log('Setting up: Level 1 + God Mode...');
    await page.keyboard.press('Backquote');
    await new Promise(r => setTimeout(r, 150));
    await page.keyboard.press('Backquote');
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.press('Digit1'); // Level 1
    await new Promise(r => setTimeout(r, 1500));

    // God mode
    await page.keyboard.press('Backquote');
    await new Promise(r => setTimeout(r, 150));
    await page.keyboard.press('Backquote');
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.press('Digit6'); // God mode
    await new Promise(r => setTimeout(r, 500));

    console.log('');
    console.log('=== GET READY ===');
    console.log(`You have ${PREP_SECONDS} seconds to set up the game how you want...`);
    console.log('');

    // Countdown
    for (let i = PREP_SECONDS; i > 0; i--) {
        process.stdout.write(`\r  ${i}s remaining...  `);
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\r                          ');
    console.log('=== RECORDING ===');
    console.log(`Recording ${RECORD_SECONDS}s — GO!`);
    console.log('');

    // Start recording
    const recordingPromise = page.evaluate(async (seconds) => {
        return new Promise((resolve) => {
            const canvas = document.querySelector('canvas');
            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 4000000,
            });
            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const buf = await blob.arrayBuffer();
                resolve(Array.from(new Uint8Array(buf)));
            };
            recorder.start(500);
            setTimeout(() => recorder.stop(), seconds * 1000);
        });
    }, RECORD_SECONDS);

    const chunks = await recordingPromise;
    const buffer = Buffer.from(chunks);
    fs.writeFileSync(OUTPUT, buffer);
    console.log(`\nSaved ${(buffer.length / 1024 / 1024).toFixed(1)} MB to ${OUTPUT}`);

    await browser.close();
    console.log('Done!');
})();
