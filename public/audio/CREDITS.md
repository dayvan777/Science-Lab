# Audio Credits

All sounds in this directory MUST be Public Domain (CC0) sourced from freesound.org or equivalent.

## sdk/

| File | Description | Status | Source |
|---|---|---|---|
| `tick.mp3` | UI click subtle (~80ms) — snap success | **TODO** | freesound.org search "ui click subtle cc0" |
| `ding.mp3` | Soft notification (~250ms) — submit success | **TODO** | freesound.org search "soft notification ding cc0" |
| `whoosh.mp3` | Low transition (~600ms) — milestone/reveal | **TODO** | freesound.org search "low whoosh transition cc0" |
| `success.mp3` | Warm chord (~1.2s) — reveal conclusion | **TODO** | freesound.org search "achievement chord short cc0" |
| `error.mp3` | Short buzz (~200ms) — input out of tolerance | **TODO** | freesound.org search "buzz short error cc0" |

**Status TODO** means the file is currently a 0-byte placeholder. The SoundManager gracefully no-ops on missing/invalid audio data, so the lab works without sounds — but the polished demo experience requires sourcing the real assets before public release.

When replacing a placeholder:
1. Download from freesound.org, verify license is CC0
2. Convert to MP3 if needed (`ffmpeg -i input.wav -q:a 9 output.mp3`)
3. Replace the placeholder file at `public/audio/sdk/<id>.mp3`
4. Update this CREDITS.md row: change "TODO" to the freesound.org URL + author name
