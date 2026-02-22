---
type: blog
title: "Building a Browser-Based Acoustic Vehicle Alerting System (AVAS) with Web Audio and Geolocation APIs"
date: 2025-10-22
outline: deep
intro: |
  Electric vehicles are silent, which poses a safety risk. This article details the engineering journey of building a 
  speed-sensitive Acoustic Vehicle Alerting System (AVAS) using standard web technologies, transforming a smartphone 
  into a safety device without native app development.
fetchReadme: false
editLink: true
image: /images/avas.webp
languages: Javascript, HTML
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The Engineering Challenge: Silent Mobility

Electric micro-mobility (scooters, e-bikes) suffers from a critical safety flaw: silence. Pedestrians rely on auditory
cues to detect approaching vehicles. In the automotive industry, this is solved by an **Acoustic Vehicle Alerting
System (AVAS)**—hardware that emits synthetic engine noise at low speeds.

I sought to replicate this safety feature using only a smartphone and a web browser, avoiding the friction of app store
approvals and proprietary hardware.

## Technical Implementation

The solution leverages two powerful browser APIs:

1. **Geolocation API**: To derive real-time velocity.
2. **Web Audio API**: To synthesize dynamic audio based on that velocity.

### Real-Time Velocity Tracking

The `navigator.geolocation.watchPosition()` method provides a continuous stream of location data. Crucially, the
`position.coords.speed` attribute returns the device's speed in meters per second, which serves as the primary control
signal for our audio synthesis.

```javascript
navigator.geolocation.watchPosition(
    (position) => {
        const speedMs = position.coords.speed || 0;
        updateAudioEngine(speedMs);
    },
    (error) => console.error("Geolocation error:", error),
    {enableHighAccuracy: true}
);
```

### Audio Synthesis Engine

Instead of playing back a static audio file, we synthesize sound in real-time to create a dynamic, responsive
experience. The Web Audio API allows us to build an audio graph where nodes (oscillators, gain, filters) are connected
to shape the sound.

#### The Signal Chain

1. **Source**: An `OscillatorNode` (sine/square wave) or a generated noise buffer (pink noise).
2. **Filter**: A `BiquadFilterNode` to sculpt the frequency content.
3. **Gain**: A `GainNode` to control amplitude.

```javascript
const audioContext = new AudioContext();
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);
```

### Mapping Speed to Sound

To create a convincing engine sound, we map the input velocity to audio parameters. As speed increases, both pitch (
frequency) and volume (gain) must rise.

Crucially, we use `linearRampToValueAtTime` to smooth the transitions. Direct parameter updates cause audible clicking
artifacts (zipper noise).

```javascript
const updateAudioEngine = (speed) => {
    const newVolume = Math.min(1.0, BASE_VOL + (speed * VOL_SENSITIVITY));
    const newFreq = Math.min(MAX_FREQ, BASE_FREQ + (speed * PITCH_SENSITIVITY));

    // Smooth transition over 0.1 seconds
    gainNode.gain.linearRampToValueAtTime(newVolume, audioContext.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(newFreq, audioContext.currentTime + 0.1);
};
```

## Advanced Synthesis: Pink Noise & Filtering

Pure tones are difficult for the human ear to localize. To improve safety, I implemented a **Pink Noise** generator.
Pink noise has equal energy per octave, making it sound more natural and "full" than white noise.

By passing pink noise through a bandpass filter and modulating the filter's frequency based on speed, we achieve a "
whooshing" effect similar to modern EVs (like the Porsche Taycan or Audi e-tron).

## Deployment & Security

Deploying this as a web app requires handling browser security policies:

1. **HTTPS**: The Geolocation API is restricted to secure contexts.
2. **Permissions Policy**: When embedded in an `iframe`, the parent page must explicitly delegate permission.

```html

<iframe src="/html/avas.html" allow="geolocation" ...></iframe>
```

## Live Demo

You can test the AVAS system below. Use the "Manual Speed" slider to simulate movement if you are stationary.

<iframe src="/html/avas.html" allow="geolocation" width="100%" height="1100pt" style="margin:3pt"></iframe>
<div style="text-align:right">View <a href="/html/avas.html" target="_blank">Page</a> or <a href="https://github.com/jonnyhoeven/justme.dev/blob/main/public/html/avas.html" target="_blank">Source</a></div>

## Conclusion

This project demonstrates the maturity of modern web APIs. We successfully built a safety-critical, real-time
application entirely within the browser, proving that web technologies can bridge the gap between software and the
physical world.
