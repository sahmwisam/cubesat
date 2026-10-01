#!/usr/bin/env python3
"""Final delivery mastering for a rendered reel (in place).

    python3 scripts/master_audio.py output/space-conference-reel_20s.mp4

HyperFrames mixes the voice, music and sound design with the right balance but
leaves the overall level conservative. This step only brings the finished mix to
social-media loudness: one static gain + a transparent look-ahead true-peak
limiter. It does not rebalance, EQ or edit anything. The video stream is copied
bit-for-bit; the audio is re-encoded once (AAC 256 kb/s).

Targets: -15 LUFS integrated, true peak <= -1.0 dBTP.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import maximum_filter1d
from scipy.signal import resample_poly

TARGET_LUFS = -15.0
CEILING_DBTP = -1.0
SR = 48000


def true_peak_db(x):
    up = resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def limit(x, ceiling_db, lookahead_ms=4.0, release_ms=90.0):
    """Offline look-ahead peak limiter: centred max window -> instant attack,
    exponential release. Transparent for the few peaks it touches."""
    c = 10 ** (ceiling_db / 20)
    peak = np.abs(x).max(axis=1)
    w = int(SR * lookahead_ms / 1000) * 2 + 1
    peak = maximum_filter1d(peak, size=w)
    need = np.minimum(1.0, c / np.maximum(peak, 1e-12))
    g = np.empty_like(need)
    k = 1 - np.exp(-1 / (SR * release_ms / 1000))
    v = 1.0
    for i in range(len(need)):  # release smoothing (attack is instant via the window)
        t = need[i]
        v = t if t < v else v + (t - v) * k
        g[i] = v
    # smooth the gain curve a touch to avoid zipper noise
    g = np.convolve(g, np.ones(48) / 48, mode="same")
    g = np.minimum(g, need)
    return x * g[:, None]


def main(path):
    tmp = tempfile.mkdtemp()
    wav_in = os.path.join(tmp, "in.wav")
    wav_out = os.path.join(tmp, "out.wav")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le", wav_in], check=True)
    x, sr = sf.read(wav_in, dtype="float64")
    assert sr == SR
    meter = pyln.Meter(SR)
    before = meter.integrated_loudness(x)
    y = x
    gain_db = TARGET_LUFS - before
    ceiling = CEILING_DBTP - 0.4  # margin for inter-sample peaks after AAC
    for _ in range(4):
        y = limit(x * 10 ** (gain_db / 20), ceiling)
        lufs = meter.integrated_loudness(y)
        gain_db += TARGET_LUFS - lufs
        if abs(TARGET_LUFS - lufs) < 0.1:
            break
    tp = true_peak_db(y)
    if tp > CEILING_DBTP - 0.2:
        y = limit(y, ceiling - (tp - (CEILING_DBTP - 0.2)))
    sf.write(wav_out, y.astype(np.float32), SR, subtype="FLOAT")
    out = path + ".mastered.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-i", wav_out, "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], check=True)
    os.replace(out, path)
    print(f"mastered {os.path.basename(path)}: {before:.1f} -> {meter.integrated_loudness(y):.1f} LUFS, static gain {gain_db:+.1f} dB, true peak {true_peak_db(y):.1f} dBTP")


if __name__ == "__main__":
    main(sys.argv[1])
