#!/usr/bin/env python3
"""
Package the XenoHammer tribute site + playable game into a single deployable folder.

Output structure:
  site/
  ├── index.html               (tribute - entry point)
  ├── archives/                 (archived Tripod/external content)
  ├── screenshots/              (reference screenshots for tribute gallery)
  └── play/                     (the game)
      ├── index.html
      ├── favicon.ico
      └── assets/               (game assets: graphics, sounds, fonts, JS)

Usage:
  cd xenohammer_2026
  python tools/package_site.py          # builds game + packages everything
  python tools/package_site.py --skip-build   # reuse existing web/dist
"""

import os
import sys
import shutil
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DIR = os.path.join(ROOT, 'site')
WEB_DIR = os.path.join(ROOT, 'web')
TRIBUTE_DIR = os.path.join(ROOT, 'tribute')
ASSETS_DIR = os.path.join(ROOT, 'assets')

SKIP_BUILD = '--skip-build' in sys.argv


def clean():
    if os.path.exists(SITE_DIR):
        shutil.rmtree(SITE_DIR)
    os.makedirs(SITE_DIR)
    print(f'Cleaned {SITE_DIR}')


def build_game():
    """Build the web game with relative base path."""
    if SKIP_BUILD:
        print('Skipping game build (--skip-build)')
        return
    print('Building game with base="./" ...')
    result = subprocess.run(
        ['npx', 'vite', 'build', '--base', './'],
        cwd=WEB_DIR, shell=True, capture_output=True, text=True
    )
    if result.returncode != 0:
        print('Build failed!')
        print(result.stderr)
        sys.exit(1)
    print('Game built successfully')


def copy_game():
    """Copy web/dist -> site/play/"""
    src = os.path.join(WEB_DIR, 'dist')
    dst = os.path.join(SITE_DIR, 'play')
    shutil.copytree(src, dst)
    print(f'Copied game to {dst}')


def copy_tribute():
    """Copy tribute site, rewriting paths to match new structure."""
    # Copy archives
    src_archives = os.path.join(TRIBUTE_DIR, 'archives')
    dst_archives = os.path.join(SITE_DIR, 'archives')
    shutil.copytree(src_archives, dst_archives)
    print(f'Copied archives')

    # Copy reference screenshots
    src_screenshots = os.path.join(ASSETS_DIR, 'reference_screenshots')
    dst_screenshots = os.path.join(SITE_DIR, 'screenshots')
    shutil.copytree(src_screenshots, dst_screenshots)
    print(f'Copied reference screenshots')

    # Read and rewrite tribute/index.html
    with open(os.path.join(TRIBUTE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    # Rewrite paths:
    #   ../web/dist/index.html  ->  play/index.html
    #   ../assets/reference_screenshots/  ->  screenshots/
    #   archives/  stays as-is (already correct)
    html = html.replace('../web/dist/index.html', 'play/index.html')
    html = re.sub(r'\.\./assets/reference_screenshots/', 'screenshots/', html)

    with open(os.path.join(SITE_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('Copied and rewritten tribute index.html')


def report():
    total_files = 0
    total_size = 0
    for root, dirs, files in os.walk(SITE_DIR):
        for f in files:
            fp = os.path.join(root, f)
            total_files += 1
            total_size += os.path.getsize(fp)
    print(f'\n=== PACKAGED SITE ===')
    print(f'Output: {SITE_DIR}')
    print(f'Files:  {total_files}')
    print(f'Size:   {total_size / 1024 / 1024:.1f} MB')
    print(f'\nReady to upload! The site/ folder is fully self-contained.')


if __name__ == '__main__':
    clean()
    build_game()
    copy_game()
    copy_tribute()
    report()
