---
type: blog
title: My Scooter Was Too Quiet, So I Forced My Browser to Make 'Vroom' Noises
date: 2025-10-22
outline: deep
intro: A slightly mad journey into using the Web Audio and Geolocation APIs to build a speed-sensitive Acoustic Vehicle Alerting System (AVAS) for my electric scooter.
fetchReadme: false
editLink: true
image: /images/avas.png
languages: Python, Gemini
fetchML: false
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute, ES6UnusedImports -->
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

## The problem,

My electric scooter is silent. Ghost-in-the-shell, ninja-on-wheels, "oh-god-where-did-you-come-from" silent. This is
great for my own inner peace, but less great for the inner peace of pedestrians, dog walkers, and anyone else who relies
on their ears to not get run over.

In the EV world, they solved this with an AVAS (Acoustic Vehicle Alerting System). A little speaker that goes "brrrrr"
or "whoosh" at low speeds. I thought, "I want one of those."

But I didn't want to buy one. I wanted to build one. And I didn't want to build an app, wait for Apple and Google to
approve it, and then... I don't know, pay developer fees?

No. I have a phone. I have a browser. And I have a perfectly good (and questionably loud) Bluetooth speaker. I'm going
to make the browser do it.

## The (Half-Baked) Plan

The goal was simple, if a bit absurd:

- Get my phone's current speed using its GPS.
- Generate a sound.
- Make the sound's volume go up when I speed up.
- Make the sound's pitch also go up when I speed up.
- All in a single HTML file.

This is a job for two of the web's coolest and most under-appreciated APIs: the Geolocation API and the Web Audio API.

## "Where am I? No... How fast am I?"

Getting the speed is surprisingly easy. The Geolocation API has a magical function called
navigator.geolocation.watchPosition(). It's like getCurrentPosition() but for people with commitment issues—it just
keeps telling you where you are, over and over.

And the best part? The position object it gives you doesn't just have latitude and longitude. It has
position.coords.speed.

```js
// This is the golden ticket.
// It fires every time the GPS chip has new data.
navigator.geolocation.watchPosition(
    (position) => {
        // speed is in meters per second, bless its little heart.
        const speedMs = position.coords.speed || 0;
        console.log(`I am speed: ${speedMs} m/s`);
    },
    (error) => {
        console.error("GPS machine broke.", error);
    },
    {
        enableHighAccuracy: true // "Yes, please drain my battery."
    } 
);
```

With speedMs in hand, I had the core-driver for the whole project.

## Making the Bleeps and Bloops

Now, for the sound. If you've never played with the Web Audio API, you're missing out. It's like a full-blown audio
production studio, but in JavaScript.

The setup is like plugging in guitar pedals:

AudioContext: This is the studio, the main power strip.

OscillatorNode: This is our instrument. It can generate a sine wave (a pure hum), a square wave (a retro game buzz),
sawtooth (a harsh synth), or triangle (a soft flute-like sound).

GainNode: This is the volume knob.

You create them, then connect() them in a chain, and finally connect them to the "speakers" (audioContext.destination).

```js
// 1. Create the studio
const audioContext = new AudioContext();

// 2. Create the volume knob
const gainNode = audioContext.createGain();
gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Start quiet

// 3. Create the instrument
const oscillator = audioContext.createOscillator();
oscillator.type = 'sine'; // "brrrrr"
oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // A low C

// 4. Plug 'em in
oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

// 5. Hit the "on" switch
oscillator.start();
```

With this, I had a continuous, slightly annoying hum. Success!

## The Dynamic Duo (Speed to Sound)

Now, to wire the GPS up to the audio. Inside the watchPosition callback, I just needed to update the gain (volume) and
frequency (pitch) based on the speed.

But you don't just set the value. That causes horrible "clicks" in the audio. The Web Audio API is classy. It asks you
to ramp to the new value.

```js
// Inside the watchPosition callback...
const speedMs = position.coords.speed || 0;

// Configurable "magic numbers"
const MIN_VOLUME = 0.15;
const VOLUME_SENSITIVITY = 0.08;
const BASE_FREQUENCY = 150;
const PITCH_SENSITIVITY = 20;
const MAX_FREQUENCY = 600;

// Calculate new values
const newVolume = Math.min(1.0, MIN_VOLUME + (speedMs * VOLUME_SENSITIVITY));
const newFreq = Math.min(MAX_FREQUENCY, BASE_FREQUENCY + (speedMs * PITCH_SENSITIVITY));

// "Please gracefully glide to these new values, thank you."
gainNode.gain.linearRampToValueAtTime(newVolume, audioContext.currentTime + 0.1);
oscillator.frequency.linearRampToValueAtTime(newFreq, audioContext.currentTime + 0.1);
```

I pressed START, waved my phone around like a lunatic, and... nothing happened. Right. GPS doesn't work well indoors.

I ran outside, hopped on my scooter, and... it worked. A gentle brrrr at a standstill, which rose to a respectable
brrrRRREEEEE as I accelerated. I was, officially, a sci-fi vehicle.

## Down the Rabbit Hole of Noise

Then I got a brilliant piece of feedback: a pure sine wave is hard to locate. People can hear it, but they can't easily
tell where it's coming from. Broadband noise (like a hiss) is much easier for the human ear to pinpoint.

The suggestion? "Can you add white noise?"

Can I add white noise? My friend, we can become the white noise.

The Web Audio API doesn't have an "Oscillator" for noise. You have to generate it by creating a buffer of static. And
while we're at it, why use white noise (equal energy at all frequencies, sounds like 'tsssss') when you can use pink
noise (equal energy per octave, sounds like 'shhhhh')? It's deeper, richer, and just plain cooler.

So I...

Wrote a function to generate a 2-second buffer of pink noise.

Played that buffer on a loop (BufferSourceNode).

Fed that into a BiquadFilterNode set to 'bandpass'.

This filter is the magic. It only lets a "band" of frequencies through. By changing the filter's frequency value, I'm
not changing the pitch of the noise itself, but which part of the noise I'm listening to.

The result? A "whoosh" sound that rises in pitch. shhHHOOOOoooo... It was perfect.

## Giving Up Control (with Sliders)

At this point, my script was a mess of "magic numbers" (PITCH_SENSITIVITY = 20, BASE_FREQUENCY = 150, etc.). I was tired
of editing the file to test new sounds.

The solution: make sliders for everything.

- Min Volume
- Volume Sensitivity
- Base Pitch
- Pitch Sensitivity
- Max Pitch
- A dropdown for the waveform (sine, square, whitenoise, pinknoise)

And, crucially, a "Manual Speed Control" slider for indoor testing.

Now I have a full-blown AVAS dashboard. Is it overkill? Absolutely. Am I proud of it? You bet I am.

## The Final Boss: The `iframe`

I wanted to host this on my blog, but that means putting it in an `iframe`. And `iframes` are tiny security sandboxes.

Two things tried to kill the project:

HTTPS: Geolocation is a sensitive API. Browsers (rightfully) refuse to run it on insecure http:// pages. Easy fix:
GitHub Pages provides https:// by default.

Permissions Policy: Even on `https`, the parent page (justme.dev) has to explicitly grant the `iframe` permission to
ask for location data.

The magic line of code in the parent page's HTML:

```html
<iframe src="/html/avas.html" allow="geolocation" width="100%" height="1000pt"></iframe>
```

With that one attribute, the final boss was defeated.

<iframe src="/html/avas.html" allow="geolocation" width="100%" height="1000pt"></iframe>

Or use the direct <a href="/html/avas.html" target="_blank">link</a> instead of the iframe.

I now have a single HTML file that turns my phone into a fully-configurable, speed-sensitive, futuristic sound generator
for my scooter. It's ridiculous, it's over-engineered, and it's exactly what I wanted.

Now if you'll excuse me, I'm going to go ride around making "whoosh" noises at pedestrians. For safety.
