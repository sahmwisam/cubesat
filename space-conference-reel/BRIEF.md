---
workflow: general-video
flow: companion
format: 1080x1920 · 9:16 · 30fps
duration: 20.00s (compact cut) · 27.80s (natural-pace cut)
language: Arabic-first (Latin only for small technical HUD labels)
---

# Brief — Annual Space Technology & Satellites Conference reel

**Subject:** المؤتمر السنوي لتكنولوجيا الفضاء والأقمار الاصطناعية — نقابة المهندسين العراقيين.
**Deliverable:** a 20-second vertical Reel (Instagram / TikTok) — cinematic, premium, futuristic,
scientific and official; never educational/childish. Subtle, dignified Iraqi identity.

**Audience on screen:** political, scientific and academic figures, engineers, space/satellite
specialists, media — shown only as generic silhouettes (no real people, no imitation of officials).

## Inputs
- Voice-over: `assets/audio/voiceover.wav` — generated with ElevenLabs at the owner's request (voice "Sufyan", an Iraqi male
  narrator, model eleven_multilingual_v2), same script as the original recording; 28.33 s file, 23.4 s of speech.
  Never edited on disk. The owner's original memo is kept as `assets/audio/voiceover-original.m4a` (unused).
- Font: DIN Next LT Arabic Regular (Arabic + Latin), the only typeface used.
- No logo was supplied → typography only, no invented emblem.

## Must-haves (from the brief)
- One consistent character: premium 2.5D stylised **Iraqi woman space engineer** (the owner asked
  for no astronaut): navy hijab, long white engineering coat with cyan light piping, AR glasses,
  conference badge, small Iraqi flag patch — same design in every scene, only the pose changes.
- Palette: deep space navy, dark blue, black, electric blue, cyan, white, subtle violet; Iraqi
  colours only as small accents (flag patch, stage flag, tricolour hairline, Iraq on the globe).
- Six short scenes (2–4 s), fast but formal pacing, smooth premium motion (ease in/out, motion
  blur on fast beats, parallax, light sweeps, subtle glitch only on the challenge beat).
- On-screen text follows the VO wording; emphasis on المؤتمر / الفضاء / الأقمار الاصطناعية /
  التحدي / الموقع / العراق / المستقبل.
- Music bed low under the voice; subtle SFX (whoosh, beeps, UI clicks, ambience, low impacts).

## Decisions
- **Duration conflict:** the VO holds 23.4 s of speech, so "exactly 20 s" requires speeding it up.
  One timing-parametric project renders two cuts: `compact` (20.00 s, VO pauses tightened +
  ×1.224 pitch-preserved via `data-playback-rate`) and `full` (27.80 s, VO at natural pace, only
  long pauses trimmed). See `src/timing.js`.
- Scene order follows the VO (the conference/gathering beat comes second because the VO says it
  second); scene numbers in `compositions/` are in playback order.
- Challenge headline uses the VO's «تحدٍّ تقني»; the brief's «تحدّي تكنولوجيا الفضاء» appears as the
  website hero title.
- Commercial font is not committed to the public repository (`assets/fonts/README.md`).
