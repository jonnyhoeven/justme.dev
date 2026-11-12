# Known Issues

## Open: Phone layout (unverified, found by code review)

- **Found:** 2026-10-04, from a static code review; not yet checked on a device or in an emulator.
- **Performance:** `backdrop-filter: blur(...)` on the navbar, feature cards and custom blocks may cause scroll jank on low-end phones.
- **Overflow risk:** blog-post iframes (`.embed-frame`) have no `max-width: 100%`.
- **Sticky hover on touch:** `.view-all-button`, `.container_row` and `.shieldButton` still apply `:hover` transforms outside `@media (hover: hover)`.
- **Music player on phones:** moved to bottom audio dock and enabled on mobile.
- **Status:** tracked in `TODO.md` under "Phone Layout Follow-ups".

## Open: XM files that failed a quick structural parse (possibly corrupt)

- **Found:** 2026-10-07, while measuring instrument-name usage across `public/audio/*.xm` (3,405 files; 3,212 parsed).
- **What failed:** a throwaway Python parser walking the XM header, patterns and instrument headers raised `struct.error` (ran out of bytes) on the 193 files below. They may be truncated or corrupt, or the throwaway parser may simply not handle some variant, so a failure here is not proof the file is bad.
- **Follow-up:** try loading each in the player (`XMPlayer`) to see which really fail; remove or re-source the broken ones from the R2 bucket.

<details>
<summary>193 files</summary>

- `AAOCG-Nero-Burning-Rom-5.5.9.0-kg.xm`
- `AAOCG-mIRC-6.x-kg.xm`
- `ACME-UltraEdit-12.x-kg.xm`
- `AGAiN-Desktop-Wizard-Pro-kg.xm`
- `AGAiN-EIQ-FirewallAnalyzer-3.2.10-kg.xm`
- `AGAiN-Express-Archiver-kg.xm`
- `AGAiN-FairStars-MP3-Recorder-kg.xm`
- `AGAiN-Link-Stash-1.6.8.0-kg.xm`
- `AGAiN-PHP-Editor-3.0-r4066-kg.xm`
- `AGES-Prey-1.0-10-trn.xm`
- `AGGRESSiON-Easy-DVD-Creator-1.1.0-kg.xm`
- `AH-Team-Accent-Office-Password-Recovery-2.12-rus-crk.xm`
- `AH-Team-Quick-Unpack-0.7.xm`
- `AT4RE-MagicTweak-4.01-kg.xm`
- `AT4RE-MakBit-Virtual-CD-DVD-1.3.0.0-serials.xm`
- `BRD-1-Video-Converter-kg.xm`
- `BReWErS-X-Blade-7-trn.xm`
- `BSA-BlazeDVD-Player-Pro-4.0-kg.xm`
- `BetaMaster-Alcohol-120-1.9.5.3105-crk.xm`
- `BetaMaster-Alcohol-120-activator.xm`
- `BetaMaster-Articons-Pro-5.1-build-23.02.2006-crk.xm`
- `BetaMaster-J.-River-Media-Center-11-crk.xm`
- `CHiCNCREAM-CuteFTP-8-Professional-8.0.2.08.22.2006.5-crk.xm`
- `CLASS-Delta-Force-Land-Warrior-setup_2.xm`
- `CORE-Ashampoo-UnInstaller-Suite-1.3-keygen.xm`
- `CORE-Big-Money-Deluxe-1.1-kg.xm`
- `CORE-ExceleTel-TeleTools-Enterprise-3.7.1.2-kg.xm`
- `CORE-Irfan-View-kg.xm`
- `CORE-Net-Patrol-1.0.xm`
- `CORE-NetObjects-Fusion-8.0-kg.xm`
- `CORE-Pivot-Pro-7.68-kg.xm`
- `CORE-Quest-Central-for-Microsoft-2.1-kg.xm`
- `CORE-Winxpsilver-kg.xm`
- `CRUDE-Ultra-Fractal-4.02-kg.xm`
- `CRUDE-XnView1.74-kg.xm`
- `Canterwood-Hex-Workshop-4.22-kg.xm`
- `CiM-Nero-6-kg.xm`
- `DARKSiDERS-Ashes-Of-Kanaka-intro.xm`
- `DEViANCE-Big-Mutha-Truckers-2-trn.xm`
- `DEViANCE-Cars-intro.xm`
- `DEViANCE-Condemned-Criminal-Origins-5-trn.xm`
- `DEViANCE-Fable-Lost-Chapters-7-trn.xm`
- `DEViANCE-Pilot-Down-Behind-Enemy-line-trn.xm`
- `DEViANCE-Serious-Sam-II-trn.xm`
- `DEViANCE-Yeti-Sports-Arctic-Adventures-trn.xm`
- `DJiNN-WinCHM-Pro-4.19-kg.xm`
- `DiGERATi-AutoRun-III-kg.xm`
- `DiGERATi-DockWare.Pro.v.2.0.2.PocketPC-kg.xm`
- `DiGERATi-Preeminence-All-crk.xm`
- `DraCooLa-WinRAR-3.40-AV-Multilanguage-crk.xm`
- `ECLIPSE-Recover-My-Files-3.94-kg.xm`
- `ECLiPSE-MIDI-Sight-Reader-kg.xm`
- `ECLiPSE-MM-LSI-M-IPEG-Codec-1.0.9.0-kg.xm`
- `ECLiPSE-Maintenance-Parts-Bin-Pro-7.4-kg.xm`
- `ECLiPSE-Ricochet-Lost-Worlds-1.0.20-kg.xm`
- `ECLiPSE-XMLwriter-2.6-kg.xm`
- `EVASiON-Rome-Total-War-1.1-trainer.xm`
- `EXPLOSiON-Acala-DVD-Ripper-2.3.2-kg.xm`
- `EXPLOSiON-Magic-Utilities-2004-3.0-kg.xm`
- `EXPLOSiON-RightClkImageCon-1.3.0-kg.xm`
- `EiTheL-Pixel-Font-Maker-1.4.0.1625-kg.xm`
- `FFF-7SinsUnlocker.xm`
- `FFF-AB-Commander-XP-6.94-crk.xm`
- `FFF-ACDSee-9.x-Photo-Manager-crk.xm`
- `FFF-AVI_MPEG_RM_WMV-Joiner-3.01-kg.xm`
- `FFF-Advanced-MP3-Converter-2.40-kg.xm`
- `FFF-AirStrike-2-intro.xm`
- `FFF-Alcohol-120-1.9.2.1705-crk.xm`
- `FFF-BlindWrite-Suite-5.2.16.154-crk.xm`
- `FFF-Bono-Longtion-GIF-Animator-crk.xm`
- `FFF-Call-of-Duty-United-Offensiv-intro.xm`
- `FFF-CrystalPlayer-1.76-Pro.xm`
- `FFF-Cute-FTP-Pro-7.1b06.07.2005.1-crk.xm`
- `FFF-Doom-3-Beta2-OpenGL1-Fix.xm`
- `FFF-Doom-3-trn.xm`
- `FFF-EA-Games-Multi-kg.xm`
- `FFF-FarCry-1.x-DVDRiP-Update-Enable-intro.xm`
- `FFF-Font-Creator-5.0.0.237.63-crk.xm`
- `FFF-Half-Life-2-Cheats-Enabler.xm`
- `FFF-HiDownload4.4-kg.xm`
- `FFF-Internet-Download-Manager-4.0.7.2-crk.xm`
- `FFF-MP3-Stream-Editor-3.2.2.231-crk.xm`
- `FFF-Nero-7.xx-kg.xm`
- `FFF-NetLimiter-Pro-2.0.x.x-crk.xm`
- `FFF-Opanda-Power-Exif-Professional-1.2x-crk.xm`
- `FFF-PainKiller-cracktro.xm`
- `FFF-S.T.A.L.K.E.R.-Oblivion-Lost-alpha-build-1xxx-trn.xm`
- `FFF-Zoom-Player-WMV-Professional-v4.03-crk.xm`
- `FFF-Zoom-Player-WMV-Professional-v4.50-beta1.xm`
- `FSS-Intervideo-WinDVR-3.x-kg.xm`
- `GENESiS-Stronghold-2-intro.xm`
- `H2O-Giga-Studio-3.10-Orchestra-kg.xm`
- `HATRED-Pirates-of-the-Caribbean.-At-Worlds-En-intro.xm`
- `HOODLUM-Chronicles-Of-Riddic-intro.xm`
- `HOODLUM-ColdFea-intro.xm`
- `HOODLUM-Manhattanchase.xm`
- `HOODLUM-The-Banishe-intro.xm`
- `HTB-Total-Commander6.53-crk.xm`
- `Hatred-Supreme-Commande-intro.xm`
- `ICU-CrackMe-v0.2.xm`
- `ICU-Sudoku-Up-2007-1.5-kg.xm`
- `ICU-XoftSpySE-4.23-crk.xm`
- `Knetus-UltraEdit-32-11.00a-kg.xm`
- `L33VaNcL33F-DAEMON-Tools-Pro-Advanced-4.10.218.0-crk.xm`
- `Lazzy-CrackMe-1.xm`
- `Lz0-tuEagle-Anti-Porn-15.x-crk.xm`
- `MYTH-Madtown-Madness-installer.xm`
- `ORiON-MPEGable-Broadcaster-2.2.7-kg.xm`
- `PARADOX-3d-studio-max-7.0-kg.xm`
- `PARADOX-Okino-Polytrans-4.1.2-crk.xm`
- `PARADOX-Photoshop-CS-2-kg.xm`
- `PWZ-LA-Rush-3-trn.xm`
- `PiZZA-GTA-SA-27-trn.xm`
- `PiZZA-LEGO-StarWars-2-trn.xm`
- `PiZZA-Pariah-9-trn.xm`
- `R2R-Native-Instruments-Kontakt-2.0.113-kg.xm`
- `RED-Active-WebTraffic-8.1.7-crk.xm`
- `RELOADED-BPRTHc64.xm`
- `REVENGE-Resource-Tuner-1.94-crk.xm`
- `REVENGE-The-Bat-Voyager-3.63.7-crk.xm`
- `REVENGE-WinBoost-4.78-kg.xm`
- `REVENGE-Zero-Spam-3.0-crk.xm`
- `Razor1911-Armed-Assault-kg.xm`
- `Razor1911-Battlefield-2142-kg.xm`
- `Razor1911-NHL-07-autorun_1.xm`
- `S.T.A.R.S.-WinSnap-universal-all-versions-crk.xm`
- `SnD-1-DVD-Audio-Ripper-1.2.12-kg.xm`
- `SnD-All-Sound-Recorder-2.28-kg.xm`
- `SnD-AnyDVD-5.4.3.1-crk.xm`
- `SnD-AnyDVD-5.8.3.1-crk.xm`
- `SnD-BestCrypt-7.xx-crk.xm`
- `SnD-DeskSoft-EarthView-3.6.x-crk.xm`
- `SnD-Kingdia-DVD-Ripper-2.5.7-kg.xm`
- `SnD-Offline-Explorer-Enterprise-4.xx-crk.xm`
- `SnD-PE-Explorer-Resource-Tuner-1.9x-crk-1.01.xm`
- `SnD-PtShare-Products-kg.xm`
- `SnD-UltraEdit-10.10-kg.xm`
- `TDS-CD-Bank-Cataloguer-Pro-kg.xm`
- `TFT-LEGO-Chick-Boutique-crk.xm`
- `TLG-Alawar-Crack-keyfinder.xm`
- `TMG-Norton-AntiVirus-Pro-2004-kg.xm`
- `TSRh-Ashampoo-UnInstaller-Platinum-Suite-1.10-kg.xm`
- `TSRh-Avi-gif-2.0-kg.xm`
- `TSRh-FolderGuard-Pro-7.6-kg.xm`
- `TSRh-IVM-Answering-Attendant-2.23-kg.xm`
- `TSRh-LANgames-BattlField2-etc-kg.xm`
- `TSRh-Resco-Explorer-2003-5.15-for-Smartphone-kg.xm`
- `TSRh-SimAquarium-2.06-Tank1-kg.xm`
- `TSRh-Solid-Converter-PDF-3.0-kg.xm`
- `TSRh-TuneUp-Utilities-2007-kg.xm`
- `TSRh-WinImage-8.0-kg.xm`
- `TSRh-iTunes-Folder-Watch-for-Windows-1.0.44-kg.xm`
- `TSRh-mIRC-6.14-kg.xm`
- `TWK-Windows-XP-UPDATE-Validation-crk.xm`
- `UNLEASHED-Civil-Disturbance-8-trn.xm`
- `USABiLiTY-WinRAR-3.70-crk.xm`
- `UnREal-Look-n-Stop-2.06-crk.xm`
- `UnderPL-1-More-WebCam-1.02-kg.xm`
- `UnderPL-Ease-Audio-Converter-2.70-kg.xm`
- `WDYL-WTN-Becky-Internet-Mail-2.21.04-kg.xm`
- `YouKing-Craagle-1.8_1.xm`
- `YouKing-Craagle-1.8_2.xm`
- `YouKing-Craagle-1.8_3.xm`
- `YouKing-Craagle-1.8_4.xm`
- `kZ-Courier-Mail-Server-2.06-crk.xm`
- `kZ-Driver-Checker-2.7.4-crk.xm`
- `kZ-Ox5-2.00-crk.xm`
- `kZ-SMAC-2.x.x.x-crk.xm`
- `nGen-BlazeDVD-3.5-Pro-kg.xm`
- `tPORt-AccessManagerForWindows60-kg.xm`
- `tPORt-Advanced-Phone-Recorder-1.7.8-kg.xm`
- `tPORt-All-Media-Fixer-6.3-crk.xm`
- `tPORt-Cistone-Media-Burner-2.3-crk.xm`
- `tPORt-Clone-Remover-1.5.1-crk.xm`
- `tPORt-DVDFab-2.22-crk.xm`
- `tPORt-Firmtools-Panorama-Composer-3.1-crk.xm`
- `tPORt-ImTOO-DVD-Ripper-Platinum-4.0.52-build-0630-crk.xm`
- `tPORt-ImTOO-MPEG-Encoder-3.1-build-0616b-crk.xm`
- `tPORt-NetworkACTIV-PIAFCTM-2.2-crk.xm`
- `tPORt-Personnal-avi-to-Video-Converter-crk.xm`
- `tPORt-Privacy-Defender-7.0.2-crk.xm`
- `tPORt-Pure-SEO-CMS-2-611-kg.xm`
- `tPORt-Recomposit-1.6-kg.xm`
- `tPORt-Ripple-Screensaver-3.2-kg.xm`
- `tPORt-Stepok-Turbo-Photo-5.1-crk.xm`
- `tPORt-WavePad-3.0-kg.xm`
- `tPORt-X-NetStat-Professional-5.xx-kg.xm`
- `tRUE-Respectsoft-Weather-Clock-3.6-crk.xm`
- `tRUE-SolSuite-8.1-crk.xm`
- `tRUE-WebcamMax-4.2.5.0-crk.xm`
- `uCF-SWF-Scanner-2.6.xm`
- `uCF-Search-Engine-Composer-5.2-kg.xm`
- `uCF-TeleportPro-kg.xm`

</details>

## Open: Tests for the full player

- **Deferred:** 2026-10-07, by choice, while the full-player overlay is being built.
- **To add (Vitest, `tests/unit/`):** instrument-name loader (trim, CP437 decoding, slot order, blank-slot gaps, trailing blanks dropped), `useMusic` state shared between the mini player and the overlay, `?track=` deep-link opening the overlay.

## Idea: attract attention from the hero button while music plays

- **Later:** show something interesting in the hero button while a track is playing (now playing, a small visualizer, pulsing with the beat) to draw people to the full player.

## Open: Mini player track name is hard to click

- **Reported:** 2026-10-07. Touch users are not considered here; this is about mouse use.
- **Where:** the scrolling track title (`.track-name-mini` inside `.track-name-mini-wrap`) in [`components/MiniPlayer.vue`](components/MiniPlayer.vue). Clicking it runs `scrollToCurrentTrack`, which scrolls the playlist to the playing track.
- **Likely causes:** while a track plays, the title runs a marquee (`mini-marquee`, 8s loop) at 12px, so the click target is small and keeps moving. The wrap also fades out at both edges (`mask-image`), and nothing signals that the title is clickable beyond a hover colour change.
- **Ideas:** pause the marquee on hover, give the wrap a larger hit area (min height/padding), and add a visible hover/focus affordance. Make it a real `<button>` so it is keyboard-reachable.
- **Unverified:** this assumes "track scroll" means the marquee title; if the playlist scrollbar was meant, update this entry.

## Open: XM features the player does not support

- **Found:** 2026-11-12, by reading [`lib/audio/xm-player.ts`](lib/audio/xm-player.ts) (effect tables, `eff_t0_e`, volume column in `nextRow`, `MixChannelIntoBuf`, `UnrollSampleLoop`, `load`). Line numbers are approximate. Nothing was run or listened to.
- **What:** `player.effects_t0` / `player.effects_t1` map unused or unimplemented slots to `eff_unimplemented*` no-ops, so a song using them plays silently wrong rather than failing. Status below is from reading the code.
- **Impact counts:** not measured. `public/audio/*.xm` is not present locally (the files live on R2), so no per-effect file counts exist. To measure later, scan pattern data of the R2 files (throwaway script outside the repo).

| Effect                                             | Status      | Where in `xm-player.ts`                              | Notes                                                                                                                                                                                                                                               |
| :------------------------------------------------- | :---------- | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7xy` Tremolo                                      | unsupported | `effects_t0[7]` / `effects_t1[7]` (about 379, 419)   | No tremolo state or waveform at all.                                                                                                                                                                                                                |
| `Kxx` Key off (at tick xx)                         | unsupported | `effects_t0[20]` / `effects_t1[20]` (about 392, 432) | The pattern key-off note (97) works: `nextRow` sets `ch.release`. Only the effect form is missing.                                                                                                                                                  |
| `Lxx` Set envelope position                        | unsupported | `effects_t0[21]` / `effects_t1[21]` (about 393, 433) | `EnvelopeFollower` has a `tick` field to set, but nothing writes it.                                                                                                                                                                                |
| `Pxy` Panning slide                                | unsupported | `effects_t0[25]` / `effects_t1[25]` (about 397, 437) |                                                                                                                                                                                                                                                     |
| `Txy` Tremor                                       | unsupported | `effects_t0[29]` / `effects_t1[29]` (about 401, 441) |                                                                                                                                                                                                                                                     |
| `X1x` / `X2x` Extra-fine porta up/down             | unsupported | `effects_t0[33]` / `effects_t1[33]` (about 405, 445) |                                                                                                                                                                                                                                                     |
| `E3x` Glissando control                            | unsupported | `eff_t0_e` (about 198), no `case 3`                  | Tone portamento never snaps to semitones.                                                                                                                                                                                                           |
| `E7x` Tremolo waveform                             | unsupported | `eff_t0_e`, no `case 7`                              | Moot until `7xy` exists.                                                                                                                                                                                                                            |
| `E9x` Retrigger note                               | unsupported | `eff_t0_e`, no `case 9`                              | Not the same as `Rxy`.                                                                                                                                                                                                                              |
| `EDx` Note delay                                   | unsupported | `eff_t0_e`, no `case 0x0d`                           | The row's note is triggered on tick 0 in `nextRow` (about 615), so the delay is ignored. A fix needs the trigger split out of `nextRow` and run on tick x.                                                                                          |
| `EEx` Pattern delay                                | unsupported | `eff_t0_e`, no `case 0x0e`                           | `nextRow` always advances.                                                                                                                                                                                                                          |
| `ECx` Note cut                                     | partial     | `eff_t1_e` (about 252)                               | Works for x > 0. `EC0` never cuts: `eff_t1_e` only runs on ticks 1 and up, and the tick-0 branch is a no-op.                                                                                                                                        |
| `Rxy` Multi retrigger                              | partial     | `eff_t0_r` (about 306), `eff_t1_r` (about 361)       | The volume change is applied once on tick 0. Later retrigger ticks only reset the sample offset; they do not repeat the volume change or restart the envelopes.                                                                                     |
| `E1x` / `E2x` Fine porta                           | partial     | `eff_t0_e` (about 203)                               | No parameter memory (`E10` slides by 0).                                                                                                                                                                                                            |
| `9xx` Sample offset                                | partial     | `eff_t0_9` (about 156)                               | No parameter memory (`900` resets to 0).                                                                                                                                                                                                            |
| `1xx` / `2xx` Porta up/down                        | partial     | `eff_t0_1`, `eff_t0_2` (about 48, 63)                | Up and down keep separate memories. Slide up has no lower period clamp.                                                                                                                                                                             |
| `Fxx` Set speed/tempo                              | partial     | `eff_t0_f` (about 263)                               | `F00` is ignored instead of stopping the song.                                                                                                                                                                                                      |
| `Dxx` Pattern break                                | partial     | `eff_t0_d` (about 189)                               | When it wraps past the last order it does not call `onEnded`, and it bypasses the out-of-range pattern check in `setCurrentPattern`.                                                                                                                |
| Volume column `Dx` / `Ex` (pan slide left/right)   | unsupported | volume column branch of `nextRow` (about 688-727)    | No branch for `0xd0-0xef`. `Cx` (set pan) and `Fx` (tone porta) work.                                                                                                                                                                               |
| Instrument auto-vibrato (type, sweep, depth, rate) | unsupported | `load` (about 1436-1570)                             | The four header fields at offsets 235-238 are never read.                                                                                                                                                                                           |
| Volume fadeout                                     | partial     | `load` (about 1523-1545)                             | Folded into the volume envelope as an extra end point, so it only applies when the volume envelope is on. Instruments without one cut on key off and ignore fadeout. With fadeout 0 and an envelope, the last envelope value is held after key off. |
| Envelope flags                                     | partial     | `load` (about 1523, 1547)                            | "Envelope on" is `type !== 0`, so bit 0 is never tested on its own.                                                                                                                                                                                 |

**Order from the TODO item and a suggested change:**

1. Key off: do the `Kxx` effect together with the key-off note path, since the note path is already there. Check key off on instruments without a volume envelope and with fadeout 0 (see the fadeout row) at the same time.
2. Note delay (`EDx`): needs the larger refactor of `nextRow`. Do it before `EEx`, `E9x` and `Rxy`, which also depend on separating "row start" from "note trigger".
3. Ping-pong loops: see below, probably nothing to do.

**Already supported, so the TODO item is out of date:**

- **Ping-pong sample loops (type bit 1):** handled. `load` calls `UnrollSampleLoop` for every ping-pong loop (and every forward loop shorter than 2048 samples), which writes the loop forwards then reversed into the sample data and rewrites `type` to forward. The `// TODO: implement pingpong looping` comment in `MixChannelIntoBuf` (about 955) is stale because the mixer only ever sees forward loops. Unverified: whether the doubled edge sample at each turnaround matches FastTracker 2 exactly (needs an audio comparison). Side effect: `getInstruments` reports `type` as forward for those samples.
- **Multi-sample keymaps:** handled. `load` keeps the 96-byte `samplemap` and `nextRow` picks `inst.samples[inst.samplemap[note]]`. The `// FIXME: ignoring keymaps` comment in `load` (about 1466) is stale. Possible crash: a keymap entry pointing past the sample count gives an undefined sample.
- **Also fine:** `0` arpeggio, `3`/`5`/`6` portamento and combos, `4` vibrato with `E4` waveform (random uses the square wave), `E5` finetune, `E6` loop, `E8` pan, `EA`/`EB`, `Gxx`, `Hxx`, `Bxx`, and both linear and Amiga frequency tables (`flags & 1`).

- **Follow-up:** implement in the order above, update the TODO item and remove the two stale comments once confirmed. Measure per-effect file counts first if the order should be driven by the archive.
