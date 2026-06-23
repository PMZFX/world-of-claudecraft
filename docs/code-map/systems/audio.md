# System: Audio

System ID: SYS-AUDIO

## Purpose

Manage music, SFX, voice events, and renderer audio sink wiring.

## Primary Files

- `src/game/audio.ts`: shared audio initialization.
- `src/game/music.ts`: music playback.
- `src/game/sfx.ts`: sound effects.
- `src/game/voice.ts`: voice playback.
- `src/game/sfx_manifest.generated.ts`: generated SFX manifest.
- `src/game/voice_manifest.generated.ts`: generated voice manifest.
- `src/ui/combat_sfx.ts`: combat event to SFX mapping.
- `src/render/audio_sink.ts`: renderer audio sink type.
- `public/audio/sfx/` and `public/audio/voice/`: source media.

## Entry Points

- `audio.init()`
- `music.init()`
- `sfx.init()`
- `voice` event handling through UI/game modules
- `renderer.setAudioSink(sfx)`

## Data Flow

```text
Player action or SimEvent
-> UI/game audio mapping
-> sfx/music/voice modules
-> browser audio output
```

## Dependencies

- Browser audio APIs
- Generated manifests
- Public audio files
- HUD event handling

## What Depends On This

- Combat feedback
- Homepage music
- Voice lines
- Renderer-originated sound cues

## Change Risk

Medium. Audio changes can affect autoplay behavior, mobile gesture unlock, file
size, and missing asset errors.

## Known Unclear Areas

- The exact voice event routing needs a deeper feature trace before major voice
  changes.

## Verification Steps

- Start from homepage and toggle music.
- Enter world after a user gesture.
- Trigger combat, loot, and UI actions that should play SFX.
- Check browser console for failed audio loads.

Last verified: 2026-06-23
