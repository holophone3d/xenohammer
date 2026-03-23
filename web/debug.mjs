/**
 * Automated debug script — launches the game in Puppeteer, captures console output,
 * errors, and takes screenshots at key moments.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:5173/';
const SCREENSHOT_DIR = path.resolve('debug_screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 800, height: 600 },
    });
    const page = await browser.newPage();

    // Collect ALL console output
    const logs = [];
    page.on('console', msg => {
        const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
        logs.push(entry);
        console.log(entry);
    });

    page.on('pageerror', err => {
        const entry = `[PAGE_ERROR] ${err.message}`;
        logs.push(entry);
        console.log(entry);
    });

    page.on('requestfailed', req => {
        const entry = `[FAILED_REQUEST] ${req.url()} - ${req.failure()?.errorText}`;
        logs.push(entry);
        console.log(entry);
    });

    console.log('--- Navigating to game ---');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for assets to load
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_load.png') });
    console.log('Screenshot: 01_initial_load.png');

    // Click canvas center to unlock audio and advance from start screen
    // Use delay:150 so mousedown is held long enough for the game loop to detect
    await page.mouse.click(400, 300, { delay: 150 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_ready_room.png') });
    console.log('Screenshot: 02_ready_room.png');

    // Click Briefing zone (center: x=200-400, y=185-218) to mark as briefed
    await page.mouse.click(300, 200, { delay: 150 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_after_briefing.png') });
    console.log('Screenshot: 03_after_briefing.png');

    // Click Launch zone (right: x=601-800, y=0-540)
    await page.mouse.click(700, 270, { delay: 150 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_gameplay_start.png') });
    console.log('Screenshot: 04_gameplay_start.png');

    // Gameplay: hold Space (fire) + move around
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowUp');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_gameplay_moving.png') });
    console.log('Screenshot: 05_gameplay_moving.png');

    // Bank left
    await page.keyboard.up('ArrowUp');
    await page.keyboard.down('ArrowLeft');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_banking_left.png') });
    console.log('Screenshot: 06_banking_left.png');

    // Bank right
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_banking_right.png') });
    console.log('Screenshot: 07_banking_right.png');

    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');

    // Wait for enemies to spawn
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_enemies.png') });
    console.log('Screenshot: 08_enemies.png');

    // More gameplay with firing
    await page.keyboard.down('Space');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_combat.png') });
    console.log('Screenshot: 09_combat.png');
    await page.keyboard.up('Space');

    // Dump console log summary
    console.log('\n--- CONSOLE LOG SUMMARY ---');
    console.log(`Total messages: ${logs.length}`);
    const errors = logs.filter(l => l.startsWith('[ERROR]') || l.startsWith('[PAGE_ERROR]'));
    const warnings = logs.filter(l => l.startsWith('[WARNING]'));
    const failed = logs.filter(l => l.startsWith('[FAILED_REQUEST]'));

    if (errors.length) {
        console.log(`\n=== ERRORS (${errors.length}) ===`);
        errors.forEach(e => console.log(e));
    }
    if (warnings.length) {
        console.log(`\n=== WARNINGS (${warnings.length}) ===`);
        warnings.slice(0, 20).forEach(w => console.log(w));
        if (warnings.length > 20) console.log(`... and ${warnings.length - 20} more`);
    }
    if (failed.length) {
        console.log(`\n=== FAILED REQUESTS (${failed.length}) ===`);
        failed.forEach(f => console.log(f));
    }

    // Save full log
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'console_log.txt'), logs.join('\n'));
    console.log('\nFull log saved to debug_screenshots/console_log.txt');

    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
    console.log('Done.');
})();
