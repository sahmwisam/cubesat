#!/usr/bin/env python3
"""Quality gate for a rendered reel.

    python3 scripts/qa.py output/space-conference-reel_20s.mp4 [--expect 20]

Checks: resolution 1080x1920 (9:16), 30 fps, exact duration, audio present,
integrated loudness / true peak, and writes a contact sheet of frames
(output/qa/<name>-sheet.jpg) for a visual pass.
"""
import json
import os
import subprocess
import sys


def main():
    path = sys.argv[1]
    expect = float(sys.argv[sys.argv.index("--expect") + 1]) if "--expect" in sys.argv else None
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path], capture_output=True, text=True).stdout)
    v = [s for s in probe["streams"] if s["codec_type"] == "video"][0]
    a = [s for s in probe["streams"] if s["codec_type"] == "audio"]
    fps = eval(v["r_frame_rate"])
    dur = float(probe["format"]["duration"])
    frames = int(v.get("nb_frames", 0))
    ok = True

    def check(name, cond, detail):
        nonlocal ok
        ok &= bool(cond)
        print(f"[{'PASS' if cond else 'FAIL'}] {name}: {detail}")

    check("resolution", (v["width"], v["height"]) == (1080, 1920), f"{v['width']}x{v['height']}")
    check("aspect 9:16", v["width"] * 16 == v["height"] * 9, f"{v['width']}:{v['height']}")
    check("frame rate", abs(fps - 30) < 1e-6, f"{fps:g} fps")
    if expect is not None:
        check("duration", abs(dur - expect) < 0.02, f"{dur:.3f}s (expected {expect:g}s, {frames} frames)")
    else:
        print(f"[INFO] duration: {dur:.3f}s, {frames} frames")
    check("audio stream", len(a) == 1, f"{a[0]['codec_name']} {a[0].get('sample_rate')} Hz {a[0].get('channels')}ch" if a else "missing")
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = out[out.rfind("Summary:"):]
    I = float(summ.split("I:")[1].split("LUFS")[0])
    peak = float(summ.split("Peak:")[1].split("dBFS")[0])
    check("loudness", -18.5 <= I <= -12.5, f"{I:.1f} LUFS integrated (social target ~ -14..-16)")
    check("true peak", peak <= -0.5, f"{peak:.1f} dBTP")

    # contact sheet: 12 frames across the timeline
    os.makedirs("output/qa", exist_ok=True)
    name = os.path.splitext(os.path.basename(path))[0]
    sheet = f"output/qa/{name}-sheet.jpg"
    n = 12
    sel = "+".join(f"eq(n\\,{int(round((i + 0.5) * frames / n))})" for i in range(n))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-vf", f"select='{sel}',scale=270:480,tile=6x2", "-frames:v", "1", "-q:v", "3", sheet])
    print(f"[INFO] contact sheet: {sheet}")
    print("RESULT:", "ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
