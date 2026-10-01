#!/usr/bin/env python3
"""Synthesise the reel's ORIGINAL score from build/timeline-<label>.json.

    python3 scripts/build_audio.py            # both cuts
    python3 scripts/build_audio.py 20s        # one cut

Writes, per cut:
  assets/audio/music-<label>.wav  cinematic space bed (pads, sub, pulse, data
                                  plucks, final resolve), ducked under the VO
  assets/audio/sfx-<label>.wav    sound design placed on the visual events
Everything is generated here (no samples), seeded, and deterministic.
"""
import json
import os
import sys
import wave

import numpy as np
import pyloudnorm as pyln
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
RNG = np.random.default_rng(1001)
LUFS_MUSIC = -31.0  # quiet bed; ducked ~9 dB more under speech
LUFS_SFX = -27.0


# ----------------------------------------------------------------- helpers
def secs(n):
    return np.arange(int(n * SR)) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, kind, f, order=2):
    if kind == "band":
        sos = butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    else:
        sos = butter(order, f / (SR / 2), btype=kind, output="sos")
    return sosfilt(sos, x, axis=0)


def stereo(m, pan=0.0):
    pan = np.clip(pan, -1, 1)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([m * l * 1.4142, m * r * 1.4142], axis=1)


def pink(n, rng=RNG):
    w = rng.standard_normal(n)
    f = np.fft.rfft(w)
    k = np.arange(len(f))
    k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n=n) * 18


def env_ar(n, a, r, curve=2.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
    return e ** (curve / 2)


def saw(freq, n, detune_cents=0.0, harmonics=24, phase=0.0):
    t = np.arange(n) / SR
    f = freq * 2 ** (detune_cents / 1200)
    out = np.zeros(n)
    for h in range(1, harmonics + 1):
        if f * h > 9000:
            break
        out += np.sin(2 * np.pi * f * h * t + phase * h) / h
    return out * 0.55


def make_ir(length=2.8, damp=0.55, seed=7):
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * 3.2 / length * 2.2)
    irs = []
    for ch in range(2):
        nz = rng.standard_normal(n) * decay
        lo = filt(nz, "low", 2500)
        mix = nz * np.exp(-t * (6 * damp)) + lo * (1 - np.exp(-t * (6 * damp)))
        mix[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        irs.append(mix)
    ir = np.stack(irs, axis=1)
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True)) * 0.6


IR_HALL = make_ir(3.2, 0.5, 11)
IR_ROOM = make_ir(1.4, 0.7, 12)


def reverb(x, ir=IR_HALL, wet=0.35):
    if x.ndim == 1:
        x = stereo(x)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet * 0.5) + y * wet


def sweep_noise(n, f0, f1, bw=0.6, curve=None, seed=0):
    """Band-limited noise whose centre frequency glides f0 -> f1 (STFT masking)."""
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n + 2048)
    win, hop = 1024, 256
    w = np.hanning(win)
    frames = 1 + (len(x) - win) // hop
    out = np.zeros(len(x))
    norm = np.zeros(len(x))
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for i in range(frames):
        s = i * hop
        u = min(1.0, s / max(1, n))
        if curve is not None:
            u = curve(u)
        fc = f0 * (f1 / f0) ** u if (f0 > 0 and f1 > 0) else f0 + (f1 - f0) * u
        lg = np.log(np.maximum(freqs, 1) / fc)
        mask = np.exp(-(lg ** 2) / (2 * bw ** 2))
        spec = np.fft.rfft(x[s : s + win] * w) * mask
        out[s : s + win] += np.fft.irfft(spec, n=win) * w
        norm[s : s + win] += w ** 2
    out = out / np.maximum(norm, 1e-6)
    return out[:n] / (np.abs(out[:n]).max() + 1e-9)


def place(buf, sig, t, gain=1.0):
    i = int(round(t * SR))
    if sig.ndim == 1:
        sig = stereo(sig)
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[: j - i] * gain


# ----------------------------------------------------------------- SFX
def sfx_impact(rng):
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    f = 38 + 62 * np.exp(-t / 0.07)
    ph = 2 * np.pi * np.cumsum(f) / SR
    boom = np.sin(ph) * np.exp(-t / 0.55)
    thump = np.sin(2 * np.pi * 118 * t) * np.exp(-t / 0.06) * 0.5
    click = filt(rng.standard_normal(n), "low", 2400) * np.exp(-t / 0.012) * 0.35
    x = boom + thump + click
    x = filt(x, "high", 25)
    return reverb(stereo(x), IR_HALL, 0.22)


def sfx_whoosh(rng, length=0.95, f0=260, f1=3800, f2=700, peak=0.6):
    n = int(length * SR)
    nz = sweep_noise(n, f0, f1, 0.55, curve=lambda u: min(1, u / peak) if u < peak else 1 - (u - peak) / (1 - peak) * 0.75, seed=int(rng.integers(1e6)))
    u = np.linspace(0, 1, n)
    amp = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) / (1 - peak) * 3.5))
    m = nz * amp
    pan = np.linspace(-0.7, 0.7, n)
    l = m * np.cos((pan + 1) * np.pi / 4) * 1.4
    r = m * np.sin((pan + 1) * np.pi / 4) * 1.4
    return reverb(np.stack([l, r], axis=1), IR_HALL, 0.28)


def sfx_riser(rng, length=1.6):
    n = int(length * SR)
    u = np.linspace(0, 1, n)
    nz = sweep_noise(n, 300, 7000, 0.5, curve=lambda x: x ** 1.5, seed=int(rng.integers(1e6)))
    f = 110 * 2 ** (2.2 * u ** 1.6)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.12
    amp = u ** 2.6
    x = (nz * 0.8 + tone) * amp
    x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return reverb(stereo(x), IR_ROOM, 0.25)


def sfx_swell(rng, length=3.0):
    n = int(length * SR)
    u = np.linspace(0, 1, n)
    t = u * length
    low = filt(pink(n, rng), "low", 220) * 0.6
    sub = np.sin(2 * np.pi * 36.7 * t) * 0.5
    amp = np.sin(np.pi * np.minimum(1, u * 1.25)) ** 1.5
    return reverb(stereo((low + sub) * amp), IR_HALL, 0.4)


def sfx_shimmer(rng, length=2.2, base=1760):
    n = int(length * SR)
    t = np.arange(n) / SR
    pent = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2]
    out = np.zeros((n, 2))
    for k in range(7):
        f = base * pent[int(rng.integers(len(pent)))] * (1 if k < 4 else 2)
        on = int((0.025 * k + rng.random() * 0.01) * SR)
        tt = t[: n - on]
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / (0.5 + rng.random() * 0.5)) * 0.18
        out[on:] += stereo(s, rng.uniform(-0.8, 0.8))
    return reverb(out, IR_HALL, 0.5)


def sfx_beep(rng, f=1760, length=0.35):
    n = int(length * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.004) * np.exp(-t / 0.05)
    s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * e * 0.5
    echo = np.zeros(n)
    d = int(0.11 * SR)
    echo[d:] = s[:-d] * 0.3
    return reverb(stereo(s) + stereo(echo, 0.5), IR_ROOM, 0.2)


def sfx_poweron(rng):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 380 * 2 ** (2.1 * np.minimum(1, t / 0.28))
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-np.maximum(0, t - 0.28) / 0.06) * np.minimum(1, t / 0.01) * 0.35
    out = stereo(chirp)
    for i, fb in enumerate([1568, 2093, 2637]):
        place(out, sfx_beep(rng, fb, 0.25) * 0.6, 0.3 + i * 0.07)
    return out


def sfx_pop(rng, f=880):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    ff = f * (1 + 0.5 * np.exp(-t / 0.02))
    s = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.09) * 0.5
    s += filt(rng.standard_normal(n), "band", (2500, 6000)) * np.exp(-t / 0.004) * 0.15
    return reverb(stereo(s, rng.uniform(-0.3, 0.3)), IR_ROOM, 0.25)


def sfx_click(rng):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    c = filt(rng.standard_normal(n), "band", (1800, 7000)) * np.exp(-t / 0.003) * 0.6
    b = np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.03) * 0.25
    return reverb(stereo(c + b), IR_ROOM, 0.15)


def sfx_shutter(rng):
    out = np.zeros((int(0.3 * SR), 2))
    for k, (dt, dur) in enumerate([(0.0, 0.004), (0.045, 0.007)]):
        n = int(0.06 * SR)
        t = np.arange(n) / SR
        c = filt(rng.standard_normal(n), "high", 2500) * np.exp(-t / dur)
        place(out, stereo(c * 0.5, 0.3), dt)
    return reverb(out, IR_ROOM, 0.3)


def sfx_crowd(rng, length=3.0):
    """Light, distant applause texture for the hall (many tiny claps)."""
    n = int(length * SR)
    out = np.zeros((n, 2))
    u = np.linspace(0, 1, n)
    clap_n = int(length * 38)
    clap = filt(rng.standard_normal(int(0.03 * SR)), "band", (900, 3500)) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.006)
    for _ in range(clap_n):
        t0 = rng.random() * length
        g = 0.12 * (0.4 + rng.random()) * np.sin(np.pi * min(1, t0 / length)) ** 0.7
        place(out, stereo(clap * g, rng.uniform(-0.9, 0.9)), t0)
    out *= (np.sin(np.pi * u) ** 0.6)[:, None]
    return reverb(out, IR_HALL, 0.55)


def sfx_dive(rng):
    n = int(0.75 * SR)
    nz = sweep_noise(n, 180, 6000, 0.5, curve=lambda u: u ** 2.2, seed=int(rng.integers(1e6)))
    u = np.linspace(0, 1, n)
    x = nz * (u ** 2.4)
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    out = reverb(stereo(x), IR_HALL, 0.3)
    return out


def sfx_telemetry(rng, length=2.2):
    n = int(length * SR)
    out = np.zeros((n, 2))
    t0 = 0.0
    while t0 < length - 0.1:
        f = rng.choice([2093, 2349, 2637, 3136])
        m = int(0.04 * SR)
        tt = np.arange(m) / SR
        s = np.sign(np.sin(2 * np.pi * f * tt)) * 0.08 * np.minimum(1, tt / 0.002) * np.exp(-tt / 0.02)
        place(out, stereo(filt(s, "low", 6000), rng.uniform(-0.6, 0.6)), t0)
        t0 += 0.06 + rng.random() * 0.22
    return reverb(out, IR_ROOM, 0.3)


def sfx_scan(rng):
    n = int(0.6 * SR)
    nz = sweep_noise(n, 6500, 900, 0.35, seed=int(rng.integers(1e6)))
    u = np.linspace(0, 1, n)
    t = u * 0.6
    tone = np.sin(2 * np.pi * np.cumsum(2400 * 2 ** (-2 * u)) / SR) * 0.15
    x = (nz * 0.7 + tone) * np.sin(np.pi * u) ** 1.2
    return reverb(stereo(x), IR_ROOM, 0.25)


def sfx_ticks(rng, length, k=1.0):
    out = np.zeros((int((length + 0.3) * SR), 2))
    step = 0.5 / k
    i = 0
    t0 = 0.0
    while t0 < length:
        n = int(0.05 * SR)
        tt = np.arange(n) / SR
        f = 2600 if i % 2 == 0 else 2100
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.008) * 0.3
        place(out, stereo(s, -0.2 if i % 2 else 0.2), t0)
        t0 += step
        i += 1
    return out


def sfx_typing(rng, length):
    out = np.zeros((int((length + 0.2) * SR), 2))
    t0 = 0.0
    while t0 < length:
        n = int(0.03 * SR)
        tt = np.arange(n) / SR
        c = filt(rng.standard_normal(n), "band", (2000, 5500)) * np.exp(-tt / 0.004) * (0.12 + rng.random() * 0.1)
        place(out, stereo(c, rng.uniform(-0.3, 0.3)), t0)
        t0 += 0.045 + rng.random() * 0.07
    return out


def sfx_unlock(rng):
    out = np.zeros((int(0.8 * SR), 2))
    place(out, sfx_click(rng) * 0.6, 0.0)
    place(out, sfx_beep(rng, 880, 0.3), 0.05)
    place(out, sfx_beep(rng, 1320, 0.35), 0.15)
    return out


def sfx_glitch(rng):
    out = np.zeros((int(0.5 * SR), 2))
    t0 = 0.0
    for i in range(6):
        n = int((0.025 + rng.random() * 0.03) * SR)
        tt = np.arange(n) / SR
        f = rng.choice([180, 360, 720, 1440, 2880])
        sq = np.sign(np.sin(2 * np.pi * f * tt))
        nz = rng.standard_normal(n)
        s = (sq * 0.5 + nz * 0.5)
        s = np.repeat(s[:: 6], 6)[:n] * 0.22  # crude sample-and-hold "bitcrush"
        place(out, stereo(filt(s, "band", (300, 7000)), rng.uniform(-0.7, 0.7)), t0)
        t0 += n / SR + rng.random() * 0.02
    return out


def sfx_confirm(rng):
    out = np.zeros((int(1.6 * SR), 2))
    for i, m in enumerate([84, 88, 91]):
        n = int(1.0 * SR)
        tt = np.arange(n) / SR
        s = (np.sin(2 * np.pi * midi(m) * tt) + 0.25 * np.sin(2 * np.pi * midi(m + 12) * tt)) * np.exp(-tt / 0.35) * 0.22
        place(out, stereo(s, -0.3 + i * 0.3), i * 0.07)
    return reverb(out, IR_HALL, 0.4)


def sfx_warp(rng):
    n = int(1.3 * SR)
    u = np.linspace(0, 1, n)
    rise = sweep_noise(n, 200, 9000, 0.45, curve=lambda x: x ** 1.8, seed=int(rng.integers(1e6)))
    amp = np.where(u < 0.62, (u / 0.62) ** 2.5, np.exp(-(u - 0.62) * 9))
    x = rise * amp
    t = u * 1.3
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * u) / SR) * amp * 0.5
    out = reverb(stereo(x + sub), IR_HALL, 0.35)
    place(out, sfx_impact(rng) * 0.5, 0.8)
    return out


def sfx_chime(rng):
    n = int(3.5 * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for m, a in [(62, 0.3), (69, 0.22), (74, 0.2), (81, 0.08)]:
        s += np.sin(2 * np.pi * midi(m) * tt) * np.exp(-tt / 1.4) * a
        s += np.sin(2 * np.pi * midi(m) * 2.76 * tt) * np.exp(-tt / 0.25) * a * 0.15  # bell partial
    s *= np.minimum(1, tt / 0.004)
    return reverb(stereo(s), IR_HALL, 0.55)


def sfx_sparkle(rng):
    return sfx_shimmer(rng, 1.4, 3136) * 0.7


def sfx_whoosh_soft(rng):
    return sfx_whoosh(rng, 0.65, 400, 2200, 900, 0.55) * 0.7


SFX = {
    "impact": lambda e, r: (sfx_impact(r), 0.0),
    "whoosh": lambda e, r: (sfx_whoosh(r), -0.95 * 0.6),
    "whoosh_soft": lambda e, r: (sfx_whoosh_soft(r), -0.65 * 0.55),
    "riser": lambda e, r: (sfx_riser(r, e.get("len", 1.6)), -e.get("len", 1.6)),
    "swell": lambda e, r: (sfx_swell(r), 0.0),
    "shimmer": lambda e, r: (sfx_shimmer(r, 2.2, float(r.choice([1175, 1397, 1568, 2093, 2349]))), 0.0),
    "beep": lambda e, r: (sfx_beep(r, e.get("f", 1760)), 0.0),
    "poweron": lambda e, r: (sfx_poweron(r), 0.0),
    "pop": lambda e, r: (sfx_pop(r, e.get("f", 880)), 0.0),
    "click": lambda e, r: (sfx_click(r), 0.0),
    "shutter": lambda e, r: (sfx_shutter(r), 0.0),
    "crowd": lambda e, r: (sfx_crowd(r, e.get("len", 3.0)), 0.0),
    "dive": lambda e, r: (sfx_dive(r), -0.72),
    "telemetry": lambda e, r: (sfx_telemetry(r, e.get("len", 2.2)), 0.0),
    "scan": lambda e, r: (sfx_scan(r), 0.0),
    "typing": lambda e, r: (sfx_typing(r, e.get("len", 2.5)), 0.0),
    "unlock": lambda e, r: (sfx_unlock(r), 0.0),
    "glitch": lambda e, r: (sfx_glitch(r), 0.0),
    "confirm": lambda e, r: (sfx_confirm(r), 0.0),
    "warp": lambda e, r: (sfx_warp(r), -0.8),
    "chime": lambda e, r: (sfx_chime(r), 0.0),
    "sparkle": lambda e, r: (sfx_sparkle(r), 0.0),
}


# ----------------------------------------------------------------- music
def voice_duck(n, segs, depth_db=-8.0, attack=0.12, release=0.45):
    """1.0 outside VO phrases, depth inside; smooth attack/release."""
    target = np.ones(n)
    g = 10 ** (depth_db / 20)
    for s in segs:
        a, b = int(s["start"] * SR), int((s["start"] + s["duration"]) * SR)
        target[max(0, a) : min(n, b)] = g
    out = np.empty(n)
    v = 1.0
    ka, kr = 1 - np.exp(-1 / (attack * SR)), 1 - np.exp(-1 / (release * SR))
    # run the one-pole smoother on a decimated grid for speed, then upsample
    step = 48
    m = (n + step - 1) // step
    dec = np.empty(m)
    for i in range(m):
        tv = target[min(n - 1, i * step)]
        k = ka if tv < v else kr
        v += (tv - v) * (1 - (1 - k) ** step)
        dec[i] = v
    out = np.interp(np.arange(n), np.arange(m) * step, dec)
    return out


def build_music(tl, ev):
    D = tl["duration"]
    n = int(D * SR)
    mus = [e for e in ev if e["type"] == "_music"][0]
    k = mus["k"]
    chords = mus["chords"]
    bounds = [c["t"] for c in chords] + [D + 3]
    rng = np.random.default_rng(77)
    pad = np.zeros((n, 2))
    sub = np.zeros(n)
    xf = 0.9  # chord crossfade
    for ci, c in enumerate(chords):
        t0, t1 = max(0, c["t"] - xf * 0.5), min(D + 0.5, bounds[ci + 1] + xf * 0.5)
        m = int((t1 - t0) * SR)
        if m <= 0:
            continue
        u = np.arange(m) / SR
        envp = np.minimum(1, u / (0.9 if ci else 2.4)) * np.minimum(1, np.maximum(0, (t1 - t0 - u)) / xf)
        seg = np.zeros((m, 2))
        for vi, note in enumerate(c["notes"]):
            f = midi(note)
            for dc, pn in [(-7, -0.6), (0, 0.0), (7, 0.6)]:
                v = saw(f, m, dc, harmonics=18, phase=rng.random() * 6.28)
                seg += stereo(v * (0.05 if note < 45 else 0.065), pn * (0.6 + 0.4 * (vi % 2)))
        seg = filt(seg, "low", 1100, order=4)  # warm pad, leaves 1-3 kHz to the voice
        seg = filt(seg, "high", 90)
        trem = 1 + 0.08 * np.sin(2 * np.pi * 0.17 * u + ci)
        seg *= (envp * trem)[:, None]
        i0 = int(t0 * SR)
        j = min(n, i0 + m)
        pad[i0:j] += seg[: j - i0]
        # sub on the chord root
        root = min(c["notes"])
        while midi(root) > 62:
            root -= 12
        sv = np.sin(2 * np.pi * midi(root) * u) * 0.32 + np.sin(2 * np.pi * midi(root) * 2 * u) * 0.08
        sub[i0:j] += (sv * envp)[: j - i0]
    # soft low pulse after the intro (8ths), tempo follows the cut's speed
    pulse = np.zeros(n)
    beat = 60 / (mus["tempo"] * k) / 2
    tp = mus["pulseFrom"]
    i = 0
    while tp < D - 0.3:
        c = [cc for cc in chords if cc["t"] <= tp + 1e-6][-1]
        root = min(c["notes"]) + (12 if i % 4 != 2 else 19)
        m = int(0.28 * SR)
        u = np.arange(m) / SR
        s = saw(midi(root), m, 0, harmonics=10) * np.exp(-u / 0.11) * np.minimum(1, u / 0.006)
        place2 = int(tp * SR)
        jj = min(n, place2 + m)
        pulse[place2:jj] += s[: jj - place2] * (0.16 if i % 2 == 0 else 0.1)
        tp += beat
        i += 1
    pulse = filt(pulse, "low", 900)
    # data plucks (arpeggio) in space-tech + website scenes
    arp = np.zeros((n, 2))
    for a0 in mus["arp"]:
        nxt = [b for b in tl["boundaries"] if b > a0 + 0.01]
        a1 = nxt[0] if nxt else D
        c = [cc for cc in chords if cc["t"] <= a0 + 0.01][-1]
        notes = sorted(c["notes"])[1:]
        seq = [notes[i % len(notes)] + 24 for i in [0, 2, 1, 3, 2, 4, 3, 1]]
        tp, i = a0 + 0.1, 0
        while tp < a1 - 0.1:
            m = int(0.35 * SR)
            u = np.arange(m) / SR
            f = midi(seq[i % len(seq)])
            s = (np.sin(2 * np.pi * f * u) + 0.18 * np.sin(2 * np.pi * 2 * f * u)) * np.exp(-u / 0.09) * 0.06
            place(arp, stereo(s, 0.5 if i % 2 else -0.5), tp)
            tp += beat / 2
            i += 1
    # space air + low rumble bed
    air = filt(RNG.standard_normal(n), "band", (3000, 9000)) * 0.004
    rumble = filt(pink(n), "low", 160) * 0.05
    amb = stereo(air + rumble)
    # final lift: octave-up strings-ish pad swelling into the lockup
    lk = [cc for cc in chords][-1]["t"]
    fin = np.zeros((n, 2))
    s0 = max(0, lk - 2.2)
    m = n - int(s0 * SR)
    u = np.arange(m) / SR
    lift = np.zeros(m)
    for note in [70, 74, 77, 81]:
        lift += saw(midi(note), m, 4, harmonics=8) * 0.03 + saw(midi(note), m, -4, harmonics=8) * 0.03
    lift = filt(lift, "low", 2600) * np.minimum(1, u / 2.0)
    fin[int(s0 * SR):] = stereo(lift)
    wet = reverb(pad + arp * 1.0 + fin, IR_HALL, 0.45)
    music = wet + stereo(sub) * 0.9 + stereo(pulse) + amb
    # duck the bed under the voice (melodic layers more than the sub)
    duck = voice_duck(n, tl["segs"], -9.0)
    music = music * duck[:, None]
    # intro fade-in and a natural tail
    music[: int(0.25 * SR)] *= np.linspace(0, 1, int(0.25 * SR))[:, None]
    music[-int(0.35 * SR):] *= np.linspace(1, 0.15, int(0.35 * SR))[:, None]
    return music


def build_sfx(tl, ev):
    D = tl["duration"]
    n = int(D * SR)
    buf = np.zeros((n + SR * 4, 2))
    rng = np.random.default_rng(31337)
    for e in ev:
        if e["type"].startswith("_"):
            continue
        if e["type"] == "ticks":
            sig = sfx_ticks(rng, max(0.1, e["until"] - e["t"]), tl["rate"])
            place(buf, sig, e["t"], e.get("gain", 1))
            continue
        sig, lead = SFX[e["type"]](e, rng)
        place(buf, sig, e["t"] + lead, e.get("gain", 1))
    out = buf[:n]
    out[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
    return out


def soft_limit(x, ceiling_db=-1.0):
    c = 10 ** (ceiling_db / 20)
    return np.tanh(x / c) * c


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main(labels):
    for label in labels:
        tl = json.load(open(os.path.join(ROOT, "build", f"timeline-{label}.json")))
        ev = tl["events"]
        music = build_music(tl, ev)
        sfx = build_sfx(tl, ev)
        # loudness-normalise the stems (EBU R128) so both cuts sit identically
        # under the voice (VO is brought to ~-16 LUFS by its track chain):
        #   music ~-31 LUFS (quiet bed, ducked further under speech), sfx ~-27 LUFS
        meter = pyln.Meter(SR)
        for name, x, target, ceil in [("music", music, LUFS_MUSIC, -6), ("sfx", sfx, LUFS_SFX, -3)]:
            lufs = meter.integrated_loudness(x)
            x = x * 10 ** ((target - lufs) / 20)
            x = soft_limit(x, ceil)
            write_wav(os.path.join(ROOT, "assets", "audio", f"{name}-{label}.wav"), x)
            print(f"{label} {name}: {meter.integrated_loudness(x):.1f} LUFS, peak {20 * np.log10(np.abs(x).max() + 1e-9):.1f} dBFS")


if __name__ == "__main__":
    main(sys.argv[1:] or ["20s", "full-vo"])
