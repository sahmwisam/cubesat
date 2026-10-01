/*
 * TIMING — single source of truth for the whole reel.
 *
 * Everything is authored in VO time (seconds into assets/audio/voiceover.wav,
 * the ElevenLabs take — voice "Sufyan", eleven_multilingual_v2). Segment edges
 * come from the waveform (-45 dBFS); word onsets from Whisper large-v3-turbo
 * suffix decoding (where the transcript starts cleanly with each word),
 * checked against the energy envelope (stop closures, pauses).
 *
 * The VO is split into segments at its natural pauses. A *variant* lays the
 * segments out on the video timeline:
 *
 *   compact  20.00 s exactly (the brief). Pauses tighten to `gap` and the VO
 *            plays at a pitch-preserved RATE (HyperFrames data-playback-rate)
 *            solved so the last word lands on `voEnd`.
 *   full     natural pace (rate 1). Pauses are kept but clamped to
 *            [gapMin, gapMax]; the video ends `tail` seconds after the VO.
 *
 * Scenes call REEL.timing.get(variant) and only ever ask for cues by name, so
 * retiming the reel means editing the tables below and re-running
 * `npm run build:audio` (regenerates index.html, timelines and the score).
 * The JSON between the markers is also read by scripts/*.py and *.mjs.
 */
(function () {
  window.REEL = window.REEL || {};

  /*JSON-BEGIN*/
  const DATA = {
    vo: {
      file: "assets/audio/voiceover.wav",
      source: "ElevenLabs · voice Sufyan (9FHjCdVXgA4tYxIYHTcZ) · eleven_multilingual_v2",
      duration: 28.328,
      segments: [
        { id: "p1", start: 0.035, end: 1.455, text: "رحلةٌ جديدة تبدأ من هنا" },
        { id: "p2", start: 2.15, end: 5.52, text: "المؤتمر السنوي لتكنولوجيا الفضاء والأقمار الاصطناعية" },
        { id: "p3a", start: 6.325, end: 9.94, text: "حدثٌ يجمع نخبةً من المهندسين والعلماء والباحثين" },
        { id: "p3b", start: 10.275, end: 13.375, text: "لبحث أحدث التقنيات ومناقشة مستقبل الفضاء" },
        { id: "p4a", start: 14.285, end: 15.445, text: "قبل انطلاق المؤتمر" },
        { id: "p4b", start: 15.775, end: 17.715, text: "نفتح المجال أمام المبتكرين" },
        { id: "p4c", start: 18.0, end: 21.6, text: "من خلال تحدٍّ تقنيٍّ عبر موقع المؤتمر الإلكتروني" },
        { id: "p5a", start: 21.61, end: 22.5, text: "قدِّم فكرتك" },
        { id: "p5b", start: 22.56, end: 24.855, text: "واجعل الابتكار جزءًا من هذه الرحلة" },
        { id: "p6", start: 25.98, end: 28.035, text: "نلتقي لنصنع المستقبل" }
      ]
    },
    // word onsets (VO seconds)
    words: {
      "rihla": 0.09, "jadida": 0.42, "tabda": 0.76, "min_huna": 1.06,
      "almutamar": 2.2, "alsanawi": 2.72, "litiknulujya": 3.12, "alfada": 3.75, "walaqmar": 4.17, "alistinaiya": 4.68,
      "hadath": 6.35, "yajmau": 6.66, "nukhba": 7.14, "almuhandisin": 7.73, "walulama": 8.29, "walbahithin": 8.86,
      "libahth": 10.3, "ahdath": 10.68, "altiqniyat": 10.97, "wamunaqasha": 11.58, "mustaqbal": 12.38, "alfada2": 12.81,
      "qabla": 14.33, "intilaq": 14.48, "almutamar2": 14.81, "naftah": 15.84, "almajal": 16.19, "amama": 16.68, "almubtakirin": 16.94,
      "min_khilal": 18.04, "tahaddin": 18.51, "tiqni": 19.01, "abra": 19.22, "mawqi": 19.85, "almutamar3": 20.27, "alilektroni": 20.8,
      "qaddim": 21.62, "fikrataka": 21.99, "wajal": 22.58, "alibtikar": 22.92, "juzan": 23.55, "min_hadhihi": 23.82, "alrihla": 24.36,
      "naltaqi": 26.01, "linasna": 26.84, "almustaqbal": 27.17
    },
    // scene boundaries in VO time (transition centres)
    scenes: [
      { id: "scene-01-intro", from: 0.0, to: 6.12 },
      { id: "scene-02-gathering", from: 6.12, to: 10.1 },
      { id: "scene-03-space-tech", from: 10.1, to: 14.1 },
      { id: "scene-04-challenge", from: 14.1, to: 19.14 },
      { id: "scene-05-website", from: 19.14, to: 21.6 },
      { id: "scene-06-final", from: 21.6, to: 999 }
    ],
    variants: {
      compact: {
        label: "20s",
        duration: 20.0,
        lead: 0.1,         // video time before the first VO word
        gap: 0.06,         // breath kept between VO segments (video seconds)
        voEnd: 19.8,       // where the last VO word must end (video seconds)
        transition: 0.5,   // scene overlap (video seconds)
        overrides: { lockup: 26.95 }  // lockup shares the closing line (no time left after it)
      },
      full: {
        label: "full-vo",
        rate: 1,
        lead: 0.3,
        gapMin: 0.18,      // natural pauses kept, but never shorter than this…
        gapMax: 0.36,      // …or longer than this (video seconds)
        tail: 1.3,         // lockup hold after the last word
        transition: 0.6,
        overrides: { lockup: 27.55 }  // lockup right after «المستقبل»
      }
    }
  };
  /*JSON-END*/

  function build(variantName) {
    const V = DATA.variants[variantName] || DATA.variants.compact;
    const P = DATA.vo.segments;
    const fit = V.voEnd !== undefined;
    let rate = V.rate || 1;
    if (fit) {
      const total = P.reduce((s, p) => s + (p.end - p.start), 0);
      rate = total / (V.voEnd - V.lead - V.gap * (P.length - 1));
    }
    const segs = [];
    let t = V.lead;
    P.forEach((p, i) => {
      const d = (p.end - p.start) / rate;
      segs.push({ id: p.id, voStart: p.start, voEnd: p.end, start: t, duration: d, rate });
      if (i < P.length - 1) {
        const natural = P[i + 1].start - p.end;
        t += d + (fit ? V.gap : Math.min(V.gapMax, Math.max(V.gapMin, natural)));
      }
    });
    const last = segs[segs.length - 1];
    const duration = V.duration !== undefined ? V.duration : Math.ceil((last.start + last.duration + V.tail) * 10) / 10;

    // VO time -> video time (piecewise linear; pauses map onto the new gaps)
    function v(tv) {
      if (tv <= segs[0].voStart) return Math.max(0, segs[0].start - (segs[0].voStart - tv) / rate);
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (tv <= s.voEnd) return s.start + (tv - s.voStart) / rate;
        const n = segs[i + 1];
        if (n && tv < n.voStart) {
          const f = (tv - s.voEnd) / (n.voStart - s.voEnd);
          return s.start + s.duration + f * (n.start - (s.start + s.duration));
        }
      }
      return last.start + last.duration + (tv - last.voEnd) / rate;
    }

    const k = rate; // animation speed factor
    const scenes = {};
    const tr = V.transition;
    DATA.scenes.forEach((s, i) => {
      const a = i === 0 ? 0 : v(s.from);
      const b = s.to >= 999 ? duration : v(s.to);
      const hostStart = i === 0 ? 0 : a - tr / 2;
      const hostEnd = s.to >= 999 ? duration : b + tr / 2;
      scenes[s.id] = { start: a, end: b, hostStart, hostDuration: hostEnd - hostStart, index: i };
    });

    function cue(name) {
      if (V.overrides && V.overrides[name] !== undefined) return v(V.overrides[name]);
      if (DATA.words[name] !== undefined) return v(DATA.words[name]);
      const sg = P.find((p) => p.id === name);
      if (sg) return v(sg.start);
      throw new Error("unknown cue " + name);
    }

    return {
      variant: variantName,
      duration,
      rate,
      k,
      d: (x) => x / k,
      v,
      cue,
      scenes,
      segs,
      transition: tr,
      // cue relative to a scene host's own start (what a sub-composition timeline uses)
      local(sceneId, name) {
        return cue(name) - scenes[sceneId].hostStart;
      },
      localT(sceneId, tVideo) {
        return tVideo - scenes[sceneId].hostStart;
      },
      boundaries: DATA.scenes.slice(1).map((s) => v(s.from))
    };
  }

  window.REEL.TIMING_DATA = DATA;
  window.REEL.timing = {
    get(variant) {
      return build(variant || window.REEL_VARIANT || "compact");
    }
  };
})();
