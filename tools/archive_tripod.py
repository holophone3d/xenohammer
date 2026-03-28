#!/usr/bin/env python3
"""Download and clean the entire saberx88.tripod.com site from the Wayback Machine."""

import re
import os
import urllib.request
import time
import sys

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'tribute', 'archives')
TRIPOD_HTML = os.path.join(BASE_DIR, 'raw', 'tripod')
TRIPOD_IMG = os.path.join(BASE_DIR, 'images', 'tripod')
EXT_DIR = os.path.join(BASE_DIR, 'raw', 'external')
GDC_IMG = os.path.join(BASE_DIR, 'images', 'gdc')

os.makedirs(TRIPOD_HTML, exist_ok=True)
os.makedirs(TRIPOD_IMG, exist_ok=True)
os.makedirs(EXT_DIR, exist_ok=True)
os.makedirs(GDC_IMG, exist_ok=True)


def clean_wayback(html):
    """Strip Wayback Machine injections from archived HTML, returning clean original content."""
    # Remove Wayback script blocks
    html = re.sub(r'<script[^>]*src="https://web-static\.archive\.org[^"]*"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script>window\.RufflePlayer[^<]*</script>\s*', '', html)
    html = re.sub(r'<script type="text/javascript">\s*__wm\.init.*?</script>\s*', '', html, flags=re.DOTALL)
    html = re.sub(r'<link rel="stylesheet"[^>]*archive\.org[^>]*/?\s*>\s*', '', html)
    html = re.sub(r'<!-- End Wayback Rewrite JS Include -->\s*', '', html)

    # Fix image URLs: /web/TIMESTAMP_im_/http://saberx88.tripod.com/X -> X
    html = re.sub(r'/web/\d+im_/http://saberx88\.tripod\.com/', '', html)
    # Fix internal page links: /web/TIMESTAMP/http://saberx88.tripod.com/X -> X
    html = re.sub(r'/web/\d+/http://saberx88\.tripod\.com/', '', html)
    # Fix external Wayback links: https://web.archive.org/web/TIMESTAMP/http://X -> http://X
    html = re.sub(r'https://web\.archive\.org/web/\d+/(https?://)', r'\1', html)
    # Fix Wayback image proxy for external images
    html = re.sub(r'/web/\d+im_/(https?://)', r'\1', html)

    # Remove Tripod ad infrastructure (the big ad table at top)
    html = re.sub(
        r'<center><table border="0" cellspacing="0" cellpadding="0">.*?</table>',
        '', html, count=1, flags=re.DOTALL
    )

    # Remove Tripod tracking scripts (LUBID, popunders, insite)
    html = re.sub(r'<script language="[Jj]ava[Ss]cript"[^>]*>[\s\S]*?</script>', '', html)
    html = re.sub(r'<noscript>[^<]*</noscript>', '', html)

    # Remove leftover empty <center></center>
    html = re.sub(r'<center>\s*</center>\s*', '', html)

    # Remove Wayback footer comments
    html = re.sub(r'\n<!--\s+FILE ARCHIVED ON[\s\S]*$', '', html)

    # Clean up whitespace
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip()


def download_url(url, retries=3):
    """Download a URL with retries, return bytes."""
    headers = {'User-Agent': 'Mozilla/5.0 (XenoHammer Archive Bot)'}
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception as e:
            print(f"  Attempt {attempt+1} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return None


def download_and_clean_html(wayback_url, output_path):
    """Download HTML from Wayback, clean it, save to file."""
    print(f"Downloading: {wayback_url}")
    data = download_url(wayback_url)
    if data is None:
        print(f"  FAILED: {wayback_url}")
        return False
    html = data.decode('utf-8', errors='replace')
    clean = clean_wayback(html)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(clean)
    print(f"  Saved: {output_path} ({len(clean)} bytes)")
    return True


def download_binary(wayback_url, output_path):
    """Download a binary file (image, doc) from Wayback."""
    print(f"Downloading: {wayback_url}")
    data = download_url(wayback_url)
    if data is None:
        print(f"  FAILED: {wayback_url}")
        return False
    with open(output_path, 'wb') as f:
        f.write(data)
    print(f"  Saved: {output_path} ({len(data)} bytes)")
    return True


# ==========================================
# TRIPOD HTML PAGES
# ==========================================
print("\n=== TRIPOD HTML PAGES ===")
tripod_pages = {
    'index.html': 'https://web.archive.org/web/20021124172252/http://saberx88.tripod.com/',
    'team.htm': 'https://web.archive.org/web/20030724054536/http://saberx88.tripod.com/team.htm',
    'screenshots.htm': 'https://web.archive.org/web/20021001121058/http://saberx88.tripod.com/screenshots.htm',
    'screen_1.htm': 'https://web.archive.org/web/20021001151857/http://saberx88.tripod.com/screen_1.htm',
    'screen_2.htm': 'https://web.archive.org/web/20021001152424/http://saberx88.tripod.com/screen_2.htm',
    'screen_3.htm': 'https://web.archive.org/web/20021001143953/http://saberx88.tripod.com/screen_3.htm',
    'docsandpresentations.htm': 'https://web.archive.org/web/20020327121148/http://saberx88.tripod.com/docsandpresentations.htm',
    'tips_and_hints.htm': 'https://web.archive.org/web/20021001160359/http://saberx88.tripod.com/tips_and_hints.htm',
}

for filename, url in tripod_pages.items():
    output = os.path.join(TRIPOD_HTML, filename)
    download_and_clean_html(url, output)
    time.sleep(1)

# ==========================================
# TRIPOD IMAGES
# ==========================================
print("\n=== TRIPOD IMAGES ===")
tripod_images = {
    'cactaur.jpg': 'https://web.archive.org/web/20021124172252im_/http://saberx88.tripod.com/images/cactaur.jpg',
    'XenoHammerGL.jpg': 'https://web.archive.org/web/20021001143953im_/http://saberx88.tripod.com/images/XenoHammerGL.jpg',
    'XenoHammerGLtmb.jpg': 'https://web.archive.org/web/20021001121058im_/http://saberx88.tripod.com/images/XenoHammerGLtmb.jpg',
    'xhattack.jpg': 'https://web.archive.org/web/20021001151857im_/http://saberx88.tripod.com/images/xhattack.jpg',
    'XHAttack_tmb.jpg': 'https://web.archive.org/web/20021001121058im_/http://saberx88.tripod.com/images/XHAttack_tmb.jpg',
    'XHCapShip.jpg': 'https://web.archive.org/web/20021001152424im_/http://saberx88.tripod.com/images/XHCapShip.jpg',
    'XHCapShip_tmb.jpg': 'https://web.archive.org/web/20021001121058im_/http://saberx88.tripod.com/images/XHCapShip_tmb.jpg',
}

for filename, url in tripod_images.items():
    output = os.path.join(TRIPOD_IMG, filename)
    download_binary(url, output)
    time.sleep(1)

# ==========================================
# TRIPOD DOCUMENTS (Word, PPT)
# ==========================================
print("\n=== TRIPOD DOCUMENTS ===")
tripod_docs_dir = os.path.join(BASE_DIR, 'raw', 'tripod', 'docs')
os.makedirs(tripod_docs_dir, exist_ok=True)

tripod_docs = {
    'resume_general.doc': 'https://web.archive.org/web/20030724054536/http://saberx88.tripod.com/resume_general.doc',
    'Resume_Brian_Smith_Xeno.doc': 'https://web.archive.org/web/20030724054536/http://saberx88.tripod.com/Resume(Brian%20Smith)Xeno.doc',
    'chris-resume.doc': 'https://web.archive.org/web/20030724054536/http://saberx88.tripod.com/chris-resume.doc',
    'docs/Preliminary_Game_Design.doc': 'https://web.archive.org/web/20020327121148/http://saberx88.tripod.com/docs/Preliminary%20Game%20Design.doc',
    'docs/Part2_Interim_Report.doc': 'https://web.archive.org/web/20020327121148/http://saberx88.tripod.com/docs/Part2%20-%20Iterm%20Report.doc',
    'docs/Part3_Progress_Report.doc': 'https://web.archive.org/web/20020327121148/http://saberx88.tripod.com/docs/part3-%20progress%20report.doc',
    'docs/Interim_Presentation.ppt': 'https://web.archive.org/web/20020327121148/http://saberx88.tripod.com/docs/Interim%20presentation.ppt',
}

for filename, url in tripod_docs.items():
    output = os.path.join(TRIPOD_HTML, filename)
    os.makedirs(os.path.dirname(output), exist_ok=True)
    download_binary(url, output)
    time.sleep(1)

# ==========================================
# GDC 2002 ARTICLE + SCREENSHOT
# ==========================================
print("\n=== GDC 2002 ARTICLE ===")
gdc_url = 'https://web.archive.org/web/20210804134017/https://archive.gamedev.net/archive/columns/events/gdc2002/view5d70.html?SectionID=27'
download_and_clean_html(gdc_url, os.path.join(EXT_DIR, 'gdc2002_student_showcase.html'))

# GDC screenshot
gdc_img_url = 'https://web.archive.org/web/20210804134017im_/https://archive.gamedev.net/archive/columns/events/gdc2002/pics/xeno1.jpg'
download_binary(gdc_img_url, os.path.join(GDC_IMG, 'xeno1.jpg'))
time.sleep(1)

gdc_thumb_url = 'https://web.archive.org/web/20210804134017im_/https://archive.gamedev.net/archive/columns/events/gdc2002/pics/xeno1t.jpg'
download_binary(gdc_thumb_url, os.path.join(GDC_IMG, 'xeno1t.jpg'))

# ==========================================
# IGF 2002 ANNOUNCEMENT
# ==========================================
print("\n=== IGF 2002 ANNOUNCEMENT ===")
download_and_clean_html(
    'https://www.gamedeveloper.com/game-platforms/igf-announces-2002-student-showcase-selections',
    os.path.join(EXT_DIR, 'igf_2002_student_showcase.html')
)

print("\n=== DONE ===")
print("Archive complete!")

# Print summary
total_files = 0
total_size = 0
for root, dirs, files in os.walk(BASE_DIR):
    for f in files:
        fp = os.path.join(root, f)
        sz = os.path.getsize(fp)
        total_files += 1
        total_size += sz

print(f"\nTotal: {total_files} files, {total_size/1024:.1f} KB")
