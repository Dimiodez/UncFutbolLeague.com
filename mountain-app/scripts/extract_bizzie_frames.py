#!/usr/bin/env python3
"""Extract transparent, bottom-aligned Bizzie frames from the supplied concept sheet."""

from __future__ import annotations

from collections import deque
from pathlib import Path
import sys

from PIL import Image, ImageDraw


FRAME_SIZE = 128
PADDING = 4
BLOCK_BOXES = [
    (10, 60, 278, 334),
    (292, 60, 558, 334),
    (565, 60, 862, 334),
    (865, 60, 1175, 334),
    (1185, 60, 1532, 334),
]
LAND_BOXES = [
    (15, 748, 278, 982),
    (292, 748, 558, 982),
    (580, 748, 868, 982),
    (875, 748, 1175, 982),
    (1185, 748, 1532, 982),
]


def is_background_green(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _alpha = pixel
    return green > 55 and green - red > 24 and green - blue > 10 and green > red * 1.18


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not is_background_green(pixels[x, y]):
            continue
        visited.add((x, y))
        red, green, blue, _alpha = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    return rgba


def keep_largest_component(image: Image.Image) -> Image.Image:
    """Discard neighboring-frame fragments while retaining Bizzie's connected silhouette."""
    rgba = image.copy()
    alpha = rgba.getchannel('A')
    width, height = rgba.size
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if (x, y) in visited or alpha.getpixel((x, y)) == 0:
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited.add((x, y))
            while queue:
                point_x, point_y = queue.popleft()
                component.append((point_x, point_y))
                for neighbor_x in range(max(0, point_x - 1), min(width, point_x + 2)):
                    for neighbor_y in range(max(0, point_y - 1), min(height, point_y + 2)):
                        neighbor = (neighbor_x, neighbor_y)
                        if neighbor not in visited and alpha.getpixel(neighbor) > 0:
                            visited.add(neighbor)
                            queue.append(neighbor)
            components.append(component)
    if not components:
        return rgba
    keep = set(max(components, key=len))
    pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            if alpha.getpixel((x, y)) > 0 and (x, y) not in keep:
                red, green, blue, _alpha = pixels[x, y]
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def crop_content(image: Image.Image) -> Image.Image:
    alpha = image.getchannel('A')
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError('No sprite content found in crop')
    return image.crop(bbox)


def normalize_series(source: Image.Image, boxes: list[tuple[int, int, int, int]], out_dir: Path) -> list[Image.Image]:
    contents = [crop_content(keep_largest_component(remove_connected_background(source.crop(box)))) for box in boxes]
    max_width = max(frame.width for frame in contents)
    max_height = max(frame.height for frame in contents)
    scale = min((FRAME_SIZE - PADDING * 2) / max_width, (FRAME_SIZE - PADDING * 2) / max_height)
    normalized: list[Image.Image] = []
    out_dir.mkdir(parents=True, exist_ok=True)

    for index, content in enumerate(contents, start=1):
        width = max(1, round(content.width * scale))
        height = max(1, round(content.height * scale))
        resized = content.resize((width, height), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        frame.alpha_composite(resized, ((FRAME_SIZE - width) // 2, FRAME_SIZE - PADDING - height))
        frame.save(out_dir / f'{index:02d}.png')
        normalized.append(frame)
    return normalized


def render_preview(block: list[Image.Image], land: list[Image.Image], out_path: Path) -> None:
    gap = 8
    label_height = 24
    width = FRAME_SIZE * 5 + gap * 4
    height = (FRAME_SIZE + label_height) * 2 + gap
    preview = Image.new('RGBA', (width, height), (235, 240, 242, 255))
    draw = ImageDraw.Draw(preview)
    for y in range(0, height, 16):
        for x in range(0, width, 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill=(216, 224, 228, 255))
    draw.rectangle((0, 0, width, label_height), fill=(18, 48, 64, 255))
    draw.text((8, 5), 'BLOCK / IMPACT', fill=(255, 255, 255, 255))
    second_label_y = FRAME_SIZE + label_height + gap
    draw.rectangle((0, second_label_y, width, second_label_y + label_height), fill=(18, 48, 64, 255))
    draw.text((8, second_label_y + 5), 'STOMP / LAND', fill=(255, 255, 255, 255))
    for index, frame in enumerate(block):
        preview.alpha_composite(frame, (index * (FRAME_SIZE + gap), label_height))
    for index, frame in enumerate(land):
        preview.alpha_composite(frame, (index * (FRAME_SIZE + gap), second_label_y + label_height))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(out_path)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('Usage: extract_bizzie_frames.py INPUT_SHEET ASSET_ROOT')
    source = Image.open(sys.argv[1]).convert('RGBA')
    root = Path(sys.argv[2])
    block = normalize_series(source, BLOCK_BOXES, root / 'bizzie-block')
    land = normalize_series(source, LAND_BOXES, root / 'bizzie-land')
    render_preview(block, land, root / 'bizzie-preview.png')


if __name__ == '__main__':
    main()
