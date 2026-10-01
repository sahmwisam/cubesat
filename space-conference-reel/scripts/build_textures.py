#!/usr/bin/env python3
"""Generate the procedural space textures used by the reel (deterministic, seeded).

    python3 scripts/build_textures.py

Outputs (assets/textures/):
  nebula.jpg   1400x2400 soft violet/blue/cyan nebula clouds (background layer)
(film grain is generated live, in compositions/fx-overlay.html)
"""
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "textures")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20261001)


def value_noise(h, w, cell, rng):
    """Smooth value noise: random lattice upsampled with smoothstep interpolation."""
    gh, gw = h // cell + 2, w // cell + 2
    lattice = rng.random((gh, gw)).astype(np.float32)
    ys = np.arange(h, dtype=np.float32) / cell
    xs = np.arange(w, dtype=np.float32) / cell
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    ty = ys - y0
    tx = xs - x0
    ty = ty * ty * (3 - 2 * ty)
    tx = tx * tx * (3 - 2 * tx)
    a = lattice[y0][:, x0]
    b = lattice[y0][:, x0 + 1]
    c = lattice[y0 + 1][:, x0]
    d = lattice[y0 + 1][:, x0 + 1]
    top = a + (b - a) * tx[None, :]
    bot = c + (d - c) * tx[None, :]
    return top + (bot - top) * ty[:, None]


def fbm(h, w, base_cell, octaves, rng, gain=0.5):
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    cell = base_cell
    for _ in range(octaves):
        out += amp * value_noise(h, w, max(2, int(cell)), rng)
        total += amp
        amp *= gain
        cell /= 2.0
    return out / total


def nebula(w=1400, h=2400):
    # domain-warped fbm for wispy structure
    n1 = fbm(h, w, 420, 6, rng)
    n2 = fbm(h, w, 260, 5, rng)
    warp = fbm(h, w, 600, 3, rng)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    shift_x = (warp - 0.5) * 220
    shift_y = (n2 - 0.5) * 160
    sx = np.clip((xx + shift_x).astype(int), 0, w - 1)
    sy = np.clip((yy + shift_y).astype(int), 0, h - 1)
    cloud = n1[sy, sx]
    cloud = np.clip((cloud - 0.42) / 0.38, 0, 1) ** 1.8

    # large-scale masks: a diagonal band + soft pools so the frame is not uniform
    band = np.exp(-(((xx / w - 0.15) - (yy / h) * 0.7) ** 2) / 0.06)
    pool_top = np.exp(-(((xx / w - 0.78) ** 2) / 0.09 + ((yy / h - 0.22) ** 2) / 0.03))
    pool_low = np.exp(-(((xx / w - 0.3) ** 2) / 0.12 + ((yy / h - 0.78) ** 2) / 0.04))
    mask = np.clip(0.55 * band + 0.75 * pool_top + 0.6 * pool_low, 0, 1)

    hue = fbm(h, w, 700, 3, rng)  # 0 violet .. 1 cyan
    violet = np.array([0.36, 0.20, 0.85], np.float32)
    blue = np.array([0.10, 0.30, 1.00], np.float32)
    cyan = np.array([0.15, 0.80, 1.00], np.float32)
    t = hue[..., None]
    col = np.where(t < 0.5, violet + (blue - violet) * (t / 0.5), blue + (cyan - blue) * ((t - 0.5) / 0.5))

    dens = (cloud * mask)[..., None]
    fine = fbm(h, w, 80, 3, rng)[..., None]
    img = col * dens * (0.55 + 0.45 * fine) * 1.05
    # a second, thinner violet veil for depth
    veil = (np.clip((fbm(h, w, 340, 5, rng) - 0.5) / 0.3, 0, 1) ** 2.2 * band)[..., None]
    img += veil * np.array([0.30, 0.12, 0.62], np.float32) * 0.55
    base = np.array([0.008, 0.016, 0.045], np.float32)  # deep navy floor
    img = base + img
    img = 1 - np.exp(-img * 1.7)  # soft tone curve
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    arr = np.asarray(im).astype(np.float32) / 255.0

    # faint baked star dust (the bright parallax stars are drawn live on canvas)
    n = 9000
    px = rng.random(n) * w
    py = rng.random(n) * h
    keep = rng.random(n) < (0.35 + 0.65 * band[py.astype(int), px.astype(int)])
    px, py = px[keep], py[keep]
    br = rng.random(len(px)) ** 3 * 0.55 + 0.06
    for x0, y0, b in zip(px.astype(int), py.astype(int), br):
        tint = np.array([0.85, 0.92, 1.0]) if b < 0.4 else np.array([1.0, 1.0, 1.0])
        arr[y0, x0] = np.clip(arr[y0, x0] + tint * b, 0, 1)
        if b > 0.35 and 0 < x0 < w - 1 and 0 < y0 < h - 1:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                arr[y0 + dy, x0 + dx] = np.clip(arr[y0 + dy, x0 + dx] + tint * b * 0.35, 0, 1)
    Image.fromarray((arr * 255).astype(np.uint8)).save(os.path.join(OUT, "nebula.jpg"), quality=90, optimize=True)


if __name__ == "__main__":
    nebula()
    print("textures written to", OUT)
