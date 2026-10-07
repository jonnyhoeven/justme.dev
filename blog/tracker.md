---
type: blog
title: 'FastTracker II & Chiptune Music Archive'
date: 2026-10-05
year: 2026
month: Oct
outline: deep
intro: |
  An interactive Web Audio FastTracker 2 (.XM) player and live visualizer. Explore 3,000+ tracker songs, watch real-time channel oscilloscopes, inspect scrolling pattern matrixes, and view sample instruments.
fetchReadme: false
editLink: true
image: /images/justme.dev.webp
hideImage: true
languages: Web Audio, FastTracker 2, Chiptune
---

<!--suppress ALL, CheckEmptyScriptTag, HtmlUnknownAttribute -->

<script setup>
import ArticleItem from '/components/ArticleItem.vue';
import ArticleFooter from '/components/ArticleFooter.vue';
import TrackerPlayer from '/components/TrackerPlayer.vue';
</script>

<ArticleItem :frontmatter="$frontmatter"/>

<TrackerPlayer />

## About Tracker Music & FastTracker II

Tracker music traces its roots back to the late 1980s and early 1990s on the Commodore Amiga and PC DOS platforms. Unlike MIDI (which only contains note instructions) or MP3 (which is pre-rendered audio), tracker modules like **FastTracker II's `.XM` (Extended Module)** format pack both the **digital audio samples** and the **composition sequence matrix** into a single compact file.

### How Tracker Synthesis Works

1. **Patterns & Rows:** Music is arranged vertically in channels (columns) and rows (usually 64 rows per pattern). As playback advances, rows trigger notes, instrument triggers, volume envelopes, and arpeggios.
2. **Channel Oscilloscopes:** Each track in an XM file is an independent voice. The player renders independent real-time waveform oscillations for each voice. You can click any channel above to mute or solo it in real time.
3. **Sharing Songs:** You can share any track directly by clicking the **Share** button above, which copies a deep link (e.g. `?track=dead_lock.xm`) that jumps right to that song.

<ArticleFooter />
