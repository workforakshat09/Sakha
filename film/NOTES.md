# Sakha film: next pass (phonk version)

## What the user asked
- Use "Nirva - Modern Funk.mp3" (not included in this repo), from 1.1 s, for 52 s.
- Edit the picture to its beats.
- Keep the product part (from the "Sakha" title onward), which the user liked.
- Redo the opening, which didn't impress.

## Track (measured on `film/music/nirva-cut.wav`, which starts at 1.1 s of the original)
- **Tempo:** 164.0 BPM, steady across all four 13-second stretches (164.01 / 163.98 / 164.01 / 164.03).
  - A beat lasts 0.36585 s, which is 10.976 frames at 30 fps.
  - A 4-beat bar lasts 1.4634 s.
- **First beat:** 0.1038 s.
- **Strongest bass hit:** beat-in-bar offset 3 at the 81.8 BPM half-time count. Downbeats may sit about 2.30 s + n × 2.93 s; confirm by ear-free measurement before cutting.
- **Level by section:** builds over 0–26 s. The big lift is at about 26.1 s, where the old edit's "Sakha" title already sits at 26 s.
- **Dips:** around 20.6 s, 38.2 s and 47 s.

## Plan
1. Make the frame grid follow the track instead of the fixed 120 BPM grid: `beatFrame(n) = round((0.1038 + n * 0.36585) * 30)`.
2. Move the scene and hit times in `comp/comp.js` (`HITS`, scene starts) onto those beats. Land the "Sakha" title on the beat nearest 26.1 s.
3. Rebuild the opening (0–26 s) as a harder phonk edit, using the skill's film language:
   - a cut or slam on every beat
   - zoom cuts
   - type windows
   - flashes
   Keep the same story: 2 a.m. noise, then Arjuna, then the friend.
4. Change `film/music.mjs` to use the Nirva cut instead of the Cinematic Indian edit, then re-measure loudness (target about -13.5 LUFS, true peak below -1 dBFS).
5. Re-render with `node film/render.mjs --blur 2`, then make the social encode (CRF 21, maxrate 6M) and a poster still.

## Done (phonk pass)
- Track map measured per beat (bass, hats, level): intro 0-37 · bass hits 38, 46, 53-54 · breakdown 55-67 · pickups 68-70 · breath 71 · drop 72-103 (kick on even beats) · break 104-109 · drop 110-133 · outro 134+.
- `comp/comp.js` rewritten on `B(n)` (frame of beat n). Opening: clock, search typed a word per beat, enter on 8, one advice post per beat (10-21), a storm every half beat (22-29), "Everyone has advice." 30 / "Nobody stays." 34, Arjuna from the first bass hit (38), zoom cuts on 53-54, breakdown "He stayed.", pickups "That friend / has / a name.", the title on the drop (72).
- Product part kept, moved onto beats: phone 78-110, feelings one per beat on the second drop (110-113), offline claims 114, "Not a therapist." 120, 2 a.m. 126, end card on the last kick (132).
- `music.mjs` now uses the Nirva cut with typing ticks; -13.5 LUFS, true peak -3.7.
- First version kept: `comp/comp-120bpm.js`, `mix-120bpm.wav`, `out/sakha-film-v1-social.mp4`.
