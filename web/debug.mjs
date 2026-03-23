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

    // Click Customization zone (left: 10-218, 260-380)
    await page.mouse.click(100, 320, { delay: 150 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_ship_customization.png') });
    console.log('Screenshot: 03_ship_customization.png');

    // Click nose blaster zone (215-290, 45-110)
    await page.mouse.click(250, 75, { delay: 150 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_cust_nose_selected.png') });
    console.log('Screenshot: 04_cust_nose_selected.png');

    // Click engine zone (220-290, 195-265)
    await page.mouse.click(255, 230, { delay: 150 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_cust_engine_selected.png') });
    console.log('Screenshot: 05_cust_engine_selected.png');

    // ESC back to Ready Room
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));

    // Click Briefing zone → Options Menu
    await page.mouse.click(300, 200, { delay: 150 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_options_menu.png') });
    console.log('Screenshot: 06_options_menu.png');

    // Click "Briefing Area" button (y center=100, so click at y=90)
    await page.mouse.click(400, 90, { delay: 150 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_briefing_submenu.png') });
    console.log('Screenshot: 07_briefing_submenu.png');

    // Click "Back Story" (y center=133, click at y=120)
    await page.mouse.click(400, 120, { delay: 150 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_backstory_scroll.png') });
    console.log('Screenshot: 08_backstory_scroll.png');

    // ESC back to briefing submenu
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));

    // Click "Level Briefing" (y center=208, click at y=195)
    await page.mouse.click(400, 195, { delay: 150 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_level_briefing.png') });
    console.log('Screenshot: 09_level_briefing.png');

    // ESC back to briefing → ESC to options → ESC to ready room
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_back_to_ready_room.png') });
    console.log('Screenshot: 10_back_to_ready_room.png');

    // Launch the game (right zone)
    await page.mouse.click(700, 270, { delay: 150 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_gameplay_start.png') });
    console.log('Screenshot: 11_gameplay_start.png');

    // Gameplay: hold Space (fire) + move around
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowUp');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_gameplay_moving.png') });
    console.log('Screenshot: 12_gameplay_moving.png');

    // Wait for enemies + combat
    await page.keyboard.up('ArrowUp');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_combat.png') });
    console.log('Screenshot: 13_combat.png');
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
