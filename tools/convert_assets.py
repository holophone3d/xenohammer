#!/usr/bin/env python3
"""
Convert PCX assets to PNG with proper transparency handling.

Reads the ClanLib resource manifest files (gameProject.txt, sfx_resources.txt)
to extract transparency color indices (tcol), converts PCX→PNG with alpha,
and copies sound/font assets to the shared assets/ directory.

Usage:
    python convert_assets.py <source_dir> <output_dir>
    
    source_dir: path to Debug/ folder containing PCX/WAV/OGG/TTF assets
    output_dir: path to assets/ output folder
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path
from PIL import Image


def parse_resource_file(filepath: Path) -> dict[str, dict]:
    """Parse ClanLib resource manifest file.

    Returns dict: { resource_id: { 'file': str, 'type': str, 'tcol': int|None } }
    """
    resources = {}
    section_stack = []

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('//'):
                continue

            # Section open
            m = re.match(r'section\s+(\w+)', line)
            if m:
                section_stack.append(m.group(1))
                continue

            # Section close
            if line == '}':
                if section_stack:
                    section_stack.pop()
                continue

            # Resource entry: key = file.ext (type=surface, tcol=N);
            m = re.match(r'(\w+)\s*=\s*(\S+)\s*\(([^)]*)\)\s*;?', line)
            if m:
                key = m.group(1)
                filename = m.group(2)
                opts_str = m.group(3)

                opts = {}
                for opt in opts_str.split(','):
                    opt = opt.strip()
                    if '=' in opt:
                        k, v = opt.split('=', 1)
                        opts[k.strip()] = v.strip()

                full_id = '/'.join(section_stack + [key])
                resources[full_id] = {
                    'file': filename,
                    'type': opts.get('type', ''),
                    'tcol': int(opts['tcol']) if 'tcol' in opts else None,
                }

    return resources


def convert_pcx_to_png(pcx_path: Path, png_path: Path, tcol: int | None = None):
    """Convert a PCX file to PNG, applying transparency if tcol is specified."""
    img = Image.open(pcx_path)

    if tcol is not None and img.mode == 'P':
        # Palette-indexed image with transparency color index
        palette = img.getpalette()
        if palette and tcol < 256:
            img = img.convert('RGBA')
            data = img.getdata()
            tr, tg, tb = palette[tcol * 3], palette[tcol * 3 + 1], palette[tcol * 3 + 2]
            new_data = []
            for r, g, b, a in data:
                if r == tr and g == tg and b == tb:
                    new_data.append((r, g, b, 0))
                else:
                    new_data.append((r, g, b, 255))
            img.putdata(new_data)
    elif tcol is not None and img.mode == 'RGB':
        # Non-paletted but we have a tcol — try to find matching color
        # (Sometimes PCX files with tcol=0 mean black is transparent)
        img = img.convert('RGBA')
    else:
        img = img.convert('RGBA')

    png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(png_path, 'PNG')


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <source_dir> <output_dir>")
        sys.exit(1)

    source_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not source_dir.exists():
        print(f"Error: source directory '{source_dir}' does not exist")
        sys.exit(1)

    graphics_out = output_dir / 'graphics'
    sounds_out = output_dir / 'sounds'
    fonts_out = output_dir / 'fonts'

    for d in [graphics_out, sounds_out, fonts_out]:
        d.mkdir(parents=True, exist_ok=True)

    # Parse resource manifests for tcol values
    tcol_map = {}  # filename (lowercase) → tcol
    for manifest_name in ['gameProject.txt', 'sfx_resources.txt', 'gui_r.txt']:
        manifest_path = source_dir / manifest_name
        if manifest_path.exists():
            resources = parse_resource_file(manifest_path)
            for rid, rinfo in resources.items():
                if rinfo['tcol'] is not None:
                    tcol_map[rinfo['file'].lower()] = rinfo['tcol']
            print(f"Parsed {manifest_name}: {len(resources)} resources")

    # Convert PCX → PNG
    pcx_files = list(source_dir.glob('*.pcx')) + list(source_dir.glob('*.PCX'))
    converted = 0
    for pcx in pcx_files:
        png_name = pcx.stem + '.png'
        png_path = graphics_out / png_name
        tcol = tcol_map.get(pcx.name.lower())
        try:
            convert_pcx_to_png(pcx, png_path, tcol)
            converted += 1
        except Exception as e:
            print(f"  WARNING: Failed to convert {pcx.name}: {e}")

    print(f"Converted {converted} PCX files to PNG")

    # Convert BMP → PNG (textures)
    bmp_files = list(source_dir.glob('*.bmp')) + list(source_dir.glob('*.BMP'))
    for bmp in bmp_files:
        png_name = bmp.stem + '.png'
        png_path = graphics_out / png_name
        try:
            img = Image.open(bmp).convert('RGBA')
            img.save(png_path, 'PNG')
            converted += 1
        except Exception as e:
            print(f"  WARNING: Failed to convert {bmp.name}: {e}")

    print(f"Converted {len(bmp_files)} BMP files to PNG")

    # Copy sound files (WAV + OGG)
    sound_count = 0
    for ext in ['*.wav', '*.WAV', '*.ogg', '*.OGG']:
        for snd in source_dir.glob(ext):
            dest = sounds_out / snd.name
            shutil.copy2(snd, dest)
            sound_count += 1
    print(f"Copied {sound_count} sound files")

    # Copy font files (TTF + TGA)
    font_count = 0
    for ext in ['*.ttf', '*.TTF', '*.tga', '*.TGA']:
        for fnt in source_dir.glob(ext):
            dest = fonts_out / fnt.name
            shutil.copy2(fnt, dest)
            font_count += 1
    print(f"Copied {font_count} font files")

    # Generate manifest.json
    manifest = {
        'graphics': {},
        'sounds': {},
        'fonts': {},
    }

    for png in sorted(graphics_out.glob('*.png')):
        key = png.stem
        manifest['graphics'][key] = f'graphics/{png.name}'

    for snd in sorted(sounds_out.iterdir()):
        key = snd.stem
        manifest['sounds'][key] = f'sounds/{snd.name}'

    for fnt in sorted(fonts_out.iterdir()):
        key = fnt.stem
        manifest['fonts'][key] = f'fonts/{fnt.name}'

    manifest_path = output_dir / 'manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\nWrote manifest to {manifest_path}")
    print(f"Total: {len(manifest['graphics'])} graphics, {len(manifest['sounds'])} sounds, {len(manifest['fonts'])} fonts")


if __name__ == '__main__':
    main()
