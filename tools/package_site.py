#!/usr/bin/env python3
"""
Package the XenoHammer site + playable game into a single deployable folder.

Source layout:
  site/                  (landing page source: index.html, archives/)
  game/web/              (TypeScript game source)
  game/web/assets/       (game assets: graphics, sounds, fonts)

Output structure:
  dist/
  ├── index.html               (landing page)
  ├── archives/                (archived Tripod/external content)
  └── play/                    (the game - fully self-contained)
      ├── index.html
      ├── favicon.ico
      └── assets/              (game assets: graphics, sounds, fonts, JS)

Usage:
  cd xenohammer_2026
  python tools/package_site.py          # builds game + packages everything
  python tools/package_site.py --skip-build   # reuse existing game/web/dist
"""

import os
import sys
import shutil
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT, 'dist')
WEB_DIR = os.path.join(ROOT, 'game', 'web')
SITE_DIR = os.path.join(ROOT, 'site')
ASSETS_DIR = os.path.join(ROOT, 'game', 'web', 'assets')

SKIP_BUILD = '--skip-build' in sys.argv


def clean():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)
    print(f'Cleaned {DIST_DIR}')


def build_game():
    """Build the web game."""
    if SKIP_BUILD:
        print('Skipping game build (--skip-build)')
        return
    print('Building game...')
    result = subprocess.run(
        ['npx', 'vite', 'build'],
        cwd=WEB_DIR, shell=True, capture_output=True, text=True
    )
    if result.returncode != 0:
        print('Build failed!')
        print(result.stderr)
        sys.exit(1)
    print('Game built successfully')


def copy_game():
    """Copy game/web/dist -> dist/play/"""
    src = os.path.join(WEB_DIR, 'dist')
    dst = os.path.join(DIST_DIR, 'play')
    shutil.copytree(src, dst)
    print(f'Copied game to {dst}')


def copy_site():
    """Copy site source, rewriting paths to match packaged structure."""
    # Copy archives
    src_archives = os.path.join(SITE_DIR, 'archives')
    dst_archives = os.path.join(DIST_DIR, 'archives')
    shutil.copytree(src_archives, dst_archives)
    print(f'Copied archives')

    # Copy hero video if it exists
    hero_video = os.path.join(SITE_DIR, 'hero-gameplay.webm')
    if os.path.exists(hero_video):
        shutil.copy2(hero_video, os.path.join(DIST_DIR, 'hero-gameplay.webm'))
        print('Copied hero video')

    # Read and rewrite site/index.html
    with open(os.path.join(SITE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    # Rewrite paths:
    #   ../game/web/dist/index.html       ->  play/index.html
    #   ../game/web/assets/fonts/mine.ttf ->  play/assets/fonts/mine.ttf
    #   archives/  stays as-is (already correct)
    html = html.replace('../game/web/dist/index.html', 'play/index.html')
    html = html.replace('../game/web/assets/fonts/mine.ttf', 'play/assets/fonts/mine.ttf')

    with open(os.path.join(DIST_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('Copied and rewritten site index.html')


def report():
    total_files = 0
    total_size = 0
    for root, dirs, files in os.walk(DIST_DIR):
        for f in files:
            fp = os.path.join(root, f)
            total_files += 1
            total_size += os.path.getsize(fp)
    print(f'\n=== PACKAGED SITE ===')
    print(f'Output: {DIST_DIR}')
    print(f'Files:  {total_files}')
    print(f'Size:   {total_size / 1024 / 1024:.1f} MB')
    print(f'\nReady to upload! The dist/ folder is fully self-contained.')


if __name__ == '__main__':
    clean()
    build_game()
    copy_game()
    copy_site()
    report()
