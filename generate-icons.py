#!/usr/bin/env python3
"""Generate PNG icons for the Stream Deck plugin - white on transparent."""
import struct
import zlib
import os
import math

IMGS_DIR = os.path.join(os.path.dirname(__file__), 'com.nirrotem.worldclock.sdPlugin', 'imgs')

WHITE = [255, 255, 255, 255]
TRANSPARENT = [0, 0, 0, 0]


def create_png(width, height, pixels):
    """Create a PNG file from RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'
        for x in range(width):
            idx = (y * width + x) * 4
            raw_data += bytes(pixels[idx:idx+4])

    idat = chunk(b'IDAT', zlib.compress(raw_data, 9))
    iend = chunk(b'IEND', b'')

    return header + ihdr + idat + iend


def draw_filled_circle(pixels, w, cx, cy, r, color):
    for y in range(max(0, cy - r), min(w, cy + r + 1)):
        for x in range(max(0, cx - r), min(w, cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                idx = (y * w + x) * 4
                pixels[idx:idx+4] = color


def draw_circle_outline(pixels, w, h, cx, cy, r, color, thickness=2):
    for y in range(max(0, cy - r - thickness), min(h, cy + r + thickness + 1)):
        for x in range(max(0, cx - r - thickness), min(w, cx + r + thickness + 1)):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if r - thickness <= dist <= r + thickness:
                idx = (y * w + x) * 4
                pixels[idx:idx+4] = color


def draw_line(pixels, w, h, x1, y1, x2, y2, color, thickness=2):
    dx = x2 - x1
    dy = y2 - y1
    steps = max(abs(dx), abs(dy), 1)
    for i in range(steps + 1):
        t = i / steps
        cx = int(x1 + dx * t)
        cy = int(y1 + dy * t)
        for ty in range(-thickness//2, thickness//2 + 1):
            for tx in range(-thickness//2, thickness//2 + 1):
                px, py = cx + tx, cy + ty
                if 0 <= px < w and 0 <= py < h:
                    idx = (py * w + px) * 4
                    pixels[idx:idx+4] = color


def draw_text_h_plus(pixels, w, h, color):
    cx, cy = w // 2, h // 3
    draw_line(pixels, w, h, cx - 14, cy - 8, cx - 14, cy + 8, color, 2)
    draw_line(pixels, w, h, cx - 6, cy - 8, cx - 6, cy + 8, color, 2)
    draw_line(pixels, w, h, cx - 14, cy, cx - 6, cy, color, 2)
    draw_line(pixels, w, h, cx + 6, cy - 6, cx + 6, cy + 6, color, 2)
    draw_line(pixels, w, h, cx + 2, cy, cx + 10, cy, color, 2)


def draw_text_h_minus(pixels, w, h, color):
    cx, cy = w // 2, h // 3
    draw_line(pixels, w, h, cx - 14, cy - 8, cx - 14, cy + 8, color, 2)
    draw_line(pixels, w, h, cx - 6, cy - 8, cx - 6, cy + 8, color, 2)
    draw_line(pixels, w, h, cx - 14, cy, cx - 6, cy, color, 2)
    draw_line(pixels, w, h, cx + 2, cy, cx + 10, cy, color, 2)


def draw_text_m_plus(pixels, w, h, color):
    cx, cy = w // 2, h // 3
    draw_line(pixels, w, h, cx - 14, cy + 8, cx - 14, cy - 8, color, 2)
    draw_line(pixels, w, h, cx - 14, cy - 8, cx - 8, cy + 2, color, 2)
    draw_line(pixels, w, h, cx - 8, cy + 2, cx - 2, cy - 8, color, 2)
    draw_line(pixels, w, h, cx - 2, cy - 8, cx - 2, cy + 8, color, 2)
    draw_line(pixels, w, h, cx + 8, cy - 6, cx + 8, cy + 6, color, 2)
    draw_line(pixels, w, h, cx + 4, cy, cx + 12, cy, color, 2)


def draw_text_m_minus(pixels, w, h, color):
    cx, cy = w // 2, h // 3
    draw_line(pixels, w, h, cx - 14, cy + 8, cx - 14, cy - 8, color, 2)
    draw_line(pixels, w, h, cx - 14, cy - 8, cx - 8, cy + 2, color, 2)
    draw_line(pixels, w, h, cx - 8, cy + 2, cx - 2, cy - 8, color, 2)
    draw_line(pixels, w, h, cx - 2, cy - 8, cx - 2, cy + 8, color, 2)
    draw_line(pixels, w, h, cx + 4, cy, cx + 12, cy, color, 2)


def draw_reset_arrow(pixels, w, h, color):
    cx, cy = w // 2, h // 2 - 4
    r = w // 4
    for angle_deg in range(45, 315):
        angle = math.radians(angle_deg)
        for t in range(-1, 2):
            x = int(cx + (r + t) * math.cos(angle))
            y = int(cy + (r + t) * math.sin(angle))
            if 0 <= x < w and 0 <= y < h:
                idx = (y * w + x) * 4
                pixels[idx:idx+4] = color
    ax = int(cx + r * math.cos(math.radians(45)))
    ay = int(cy + r * math.sin(math.radians(45)))
    draw_line(pixels, w, h, ax, ay, ax - 6, ay - 2, color, 2)
    draw_line(pixels, w, h, ax, ay, ax - 2, ay + 6, color, 2)


def generate_icon(name, draw_func, size=72):
    pixels = TRANSPARENT * (size * size)
    draw_func(pixels, size, size)

    png_data = create_png(size, size, pixels)
    filepath = os.path.join(IMGS_DIR, f'{name}.png')
    with open(filepath, 'wb') as f:
        f.write(png_data)
    print(f'  Generated: {name}.png ({size}x{size})')

    size2 = size * 2
    pixels2 = TRANSPARENT * (size2 * size2)
    draw_func(pixels2, size2, size2)
    png_data2 = create_png(size2, size2, pixels2)
    filepath2 = os.path.join(IMGS_DIR, f'{name}@2x.png')
    with open(filepath2, 'wb') as f:
        f.write(png_data2)
    print(f'  Generated: {name}@2x.png ({size2}x{size2})')


def draw_clock(pixels, w, h):
    cx, cy = w // 2, h // 2
    r = int(w * 0.4)
    draw_circle_outline(pixels, w, h, cx, cy, r, WHITE, max(2, w // 36))
    draw_line(pixels, w, h, cx, cy, cx, cy - int(r * 0.6), WHITE, max(2, w // 30))
    draw_line(pixels, w, h, cx, cy, cx + int(r * 0.5), cy, WHITE, max(2, w // 40))
    draw_filled_circle(pixels, w, cx, cy, max(2, w // 24), WHITE)


def draw_hour_plus(pixels, w, h):
    draw_text_h_plus(pixels, w, h, WHITE)


def draw_hour_minus(pixels, w, h):
    draw_text_h_minus(pixels, w, h, WHITE)


def draw_min_plus(pixels, w, h):
    draw_text_m_plus(pixels, w, h, WHITE)


def draw_min_minus(pixels, w, h):
    draw_text_m_minus(pixels, w, h, WHITE)


def draw_reset(pixels, w, h):
    draw_reset_arrow(pixels, w, h, WHITE)


def main():
    os.makedirs(IMGS_DIR, exist_ok=True)
    print('Generating Stream Deck icons (white on transparent)...')

    icons = [
        ('plugin-icon', draw_clock, 72),
        ('category-icon', draw_clock, 28),
        ('clock-icon', draw_clock, 72),
        ('hour-plus-icon', draw_hour_plus, 72),
        ('hour-minus-icon', draw_hour_minus, 72),
        ('min-plus-icon', draw_min_plus, 72),
        ('min-minus-icon', draw_min_minus, 72),
        ('reset-icon', draw_reset, 72),
    ]

    for name, func, size in icons:
        generate_icon(name, func, size)

    print('\nDone! All icons generated (white on transparent background).')


if __name__ == '__main__':
    main()
