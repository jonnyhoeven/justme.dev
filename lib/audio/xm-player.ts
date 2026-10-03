/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-var */
/**
 * FastTracker 2 (.XM) Player for Web Audio API.
 * Adapted from Andy Sloane's jsxm for modern TypeScript / ES Module environments.
 */

export interface XMPlayerOptions {
  bufferSize?: number;
  onEnded?: () => void;
}

function debugLog(..._args: any[]) {}

function createXMEngine() {
  const player: any = {
    cur_songpos: -1,
    cur_pat: -1,
    cur_row: 64,
    cur_ticksamp: 0,
    cur_tick: 6,
    xm: {},
    max_global_volume: 128,
    playing: false,
    audioctx: null,
    onEnded: null
  };

  const XMView: any = {
    scope_width: 0,
    pushEvent: null,
    resume: null,
    pause: null,
    stop: null
  };

  var jsNode: any = null;
  var gainNode: any = null;

  function eff_t1_0(ch) {
    // arpeggio
    if (ch.effectdata !== 0 && ch.inst !== undefined) {
      const arpeggio = [0, ch.effectdata >> 4, ch.effectdata & 15];
      const note = ch.note + arpeggio[player.cur_tick % 3];
      ch.period = player.periodForNote(ch, note);
    }
  }

  function eff_t0_1(ch, data) {
    // pitch slide up
    if (data !== 0) {
      ch.slideupspeed = data;
    }
  }

  function eff_t1_1(ch) {
    // pitch slide up
    if (ch.slideupspeed !== undefined) {
      // is this limited? it appears not
      ch.period -= ch.slideupspeed;
    }
  }

  function eff_t0_2(ch, data) {
    // pitch slide down
    if (data !== 0) {
      ch.slidedownspeed = data;
    }
  }

  function eff_t1_2(ch) {
    // pitch slide down
    if (ch.slidedownspeed !== undefined) {
      // 1728 is the period for C-1
      ch.period = Math.min(1728, ch.period + ch.slidedownspeed);
    }
  }

  function eff_t0_3(ch, data) {
    // portamento
    if (data !== 0) {
      ch.portaspeed = data;
    }
  }

  function eff_t1_3(ch) {
    // portamento
    if (ch.periodtarget !== undefined && ch.portaspeed !== undefined) {
      if (ch.period > ch.periodtarget) {
        ch.period = Math.max(ch.periodtarget, ch.period - ch.portaspeed);
      } else {
        ch.period = Math.min(ch.periodtarget, ch.period + ch.portaspeed);
      }
    }
  }

  function eff_t0_4(ch, data) {
    // vibrato
    if (data & 0x0f) {
      ch.vibratodepth = (data & 0x0f) * 2;
    }
    if (data >> 4) {
      ch.vibratospeed = data >> 4;
    }
    eff_t1_4(ch);
  }

  function eff_t1_4(ch) {
    // vibrato
    ch.periodoffset =
      getVibratoDelta(ch.vibratotype, ch.vibratopos) * ch.vibratodepth;
    if (isNaN(ch.periodoffset)) {
      debugLog(
        'vibrato periodoffset NaN?',
        ch.vibratopos,
        ch.vibratospeed,
        ch.vibratodepth
      );
      ch.periodoffset = 0;
    }
    // only updates on non-first ticks
    if (player.cur_tick > 0) {
      ch.vibratopos += ch.vibratospeed;
      ch.vibratopos &= 63;
    }
  }

  function getVibratoDelta(type, x) {
    let delta = 0;
    switch (type & 0x03) {
      case 1: // sawtooth (ramp-down)
        delta = ((1 + (x * 2) / 64) % 2) - 1;
        break;
      case 2: // square
      case 3: // random (in FT2 these two are the same)
        delta = x < 32 ? 1 : -1;
        break;
      case 0:
      default: // sine
        delta = Math.sin((x * Math.PI) / 32);
        break;
    }
    return delta;
  }

  function eff_t1_5(ch) {
    // portamento + volume slide
    eff_t1_a(ch);
    eff_t1_3(ch);
  }

  function eff_t1_6(ch) {
    // vibrato + volume slide
    eff_t1_a(ch);
    eff_t1_4(ch);
  }

  function eff_t0_8(ch, data) {
    // set panning
    ch.pan = data;
  }

  function eff_t0_9(ch, data) {
    // sample offset
    ch.off = data * 256;
  }

  function eff_t0_a(ch, data) {
    // volume slide
    if (data) {
      ch.volumeslide = -(data & 0x0f) + (data >> 4);
    }
  }

  function eff_t1_a(ch) {
    // volume slide
    if (ch.volumeslide !== undefined) {
      ch.vol = Math.max(0, Math.min(64, ch.vol + ch.volumeslide));
    }
  }

  function eff_t0_b(ch, data) {
    // song jump
    if (data < player.xm.songpats.length) {
      player.cur_songpos = data - 1;
      player.cur_pat = -1;
      player.cur_row = -1;
    }
  }

  function eff_t0_c(ch, data) {
    // set volume
    ch.vol = Math.min(64, data);
  }

  function eff_t0_d(ch, data) {
    // pattern jump
    player.cur_songpos++;
    if (player.cur_songpos >= player.xm.songpats.length)
      player.cur_songpos = player.xm.song_looppos;
    player.cur_pat = player.xm.songpats[player.cur_songpos];
    player.next_row = (data >> 4) * 10 + (data & 0x0f);
  }

  function eff_t0_e(ch, data) {
    // extended effects!
    const eff = data >> 4;
    data = data & 0x0f;
    switch (eff) {
      case 1: // fine porta up
        ch.period -= data;
        break;
      case 2: // fine porta down
        ch.period += data;
        break;
      case 4: // set vibrato waveform
        ch.vibratotype = data & 0x07;
        break;
      case 5: // finetune
        ch.fine = (data << 4) + data - 128;
        break;
      case 6: // pattern loop
        if (data == 0) {
          ch.loopstart = player.cur_row;
        } else {
          if (typeof ch.loopend === 'undefined') {
            ch.loopend = player.cur_row;
            ch.loopremaining = data;
          }
          if (ch.loopremaining !== 0) {
            ch.loopremaining--;
            player.next_row = ch.loopstart || 0;
          } else {
            delete ch.loopend;
            delete ch.loopstart;
          }
        }
        break;
      case 8: // panning
        ch.pan = data * 0x11;
        break;
      case 0x0a: // fine vol slide up (with memory)
        if (data === 0 && ch.finevolup !== undefined) data = ch.finevolup;
        ch.vol = Math.min(64, ch.vol + data);
        ch.finevolup = data;
        break;
      case 0x0b: // fine vol slide down
        if (data === 0 && ch.finevoldown !== undefined) data = ch.finevoldown;
        ch.vol = Math.max(0, ch.vol - data);
        ch.finevoldown = data;
        break;
      case 0x0c: // note cut handled in eff_t1_e
        break;
      default:
        debugLog('unimplemented extended effect E', ch.effectdata.toString(16));
        break;
    }
  }

  function eff_t1_e(ch) {
    // note cut
    switch (ch.effectdata >> 4) {
      case 0x0c:
        if (player.cur_tick == (ch.effectdata & 0x0f)) {
          ch.vol = 0;
        }
        break;
    }
  }

  function eff_t0_f(ch, data) {
    // set tempo
    if (data === 0) {
      debugLog('tempo 0?');
      return;
    } else if (data < 0x20) {
      player.xm.tempo = data;
    } else {
      player.xm.bpm = data;
    }
  }

  function eff_t0_g(ch, data) {
    // set global volume
    if (data <= 0x40) {
      // volume gets multiplied by 2 to match
      // the initial max global volume of 128
      player.xm.global_volume = Math.max(0, data * 2);
    } else {
      player.xm.global_volume = player.max_global_volume;
    }
  }

  function eff_t0_h(ch, data) {
    // global volume slide
    if (data) {
      // same as Axy but multiplied by 2
      player.xm.global_volumeslide = (-(data & 0x0f) + (data >> 4)) * 2;
    }
  }

  function eff_t1_h(ch) {
    // global volume slide
    if (player.xm.global_volumeslide !== undefined) {
      player.xm.global_volume = Math.max(
        0,
        Math.min(
          player.max_global_volume,
          player.xm.global_volume + player.xm.global_volumeslide
        )
      );
    }
  }

  function eff_t0_r(ch, data) {
    // retrigger
    if (data & 0x0f) ch.retrig = (ch.retrig & 0xf0) + (data & 0x0f);
    if (data & 0xf0) ch.retrig = (ch.retrig & 0x0f) + (data & 0xf0);

    // retrigger volume table
    switch (ch.retrig >> 4) {
      case 1:
        ch.vol -= 1;
        break;
      case 2:
        ch.vol -= 2;
        break;
      case 3:
        ch.vol -= 4;
        break;
      case 4:
        ch.vol -= 8;
        break;
      case 5:
        ch.vol -= 16;
        break;
      case 6:
        ch.vol *= 2;
        ch.vol /= 3;
        break;
      case 7:
        ch.vol /= 2;
        break;
      case 9:
        ch.vol += 1;
        break;
      case 0x0a:
        ch.vol += 2;
        break;
      case 0x0b:
        ch.vol += 4;
        break;
      case 0x0c:
        ch.vol += 8;
        break;
      case 0x0d:
        ch.vol += 16;
        break;
      case 0x0e:
        ch.vol *= 3;
        ch.vol /= 2;
        break;
      case 0x0f:
        ch.vol *= 2;
        break;
    }
    ch.vol = Math.min(64, Math.max(0, ch.vol));
  }

  function eff_t1_r(ch) {
    if (player.cur_tick % (ch.retrig & 0x0f) === 0) {
      ch.off = 0;
    }
  }

  function eff_unimplemented() {}
  function eff_unimplemented_t0(ch, data) {
    debugLog('unimplemented effect', player.prettify_effect(ch.effect, data));
  }

  player.effects_t0 = [
    // effect functions on tick 0
    eff_t1_0, // 1, arpeggio is processed on all ticks
    eff_t0_1,
    eff_t0_2,
    eff_t0_3,
    eff_t0_4, // 4
    eff_t0_a, // 5, same as A on first tick
    eff_t0_a, // 6, same as A on first tick
    eff_unimplemented_t0, // 7
    eff_t0_8, // 8
    eff_t0_9, // 9
    eff_t0_a, // a
    eff_t0_b, // b
    eff_t0_c, // c
    eff_t0_d, // d
    eff_t0_e, // e
    eff_t0_f, // f
    eff_t0_g, // g
    eff_t0_h, // h
    eff_unimplemented_t0, // i
    eff_unimplemented_t0, // j
    eff_unimplemented_t0, // k
    eff_unimplemented_t0, // l
    eff_unimplemented_t0, // m
    eff_unimplemented_t0, // n
    eff_unimplemented_t0, // o
    eff_unimplemented_t0, // p
    eff_unimplemented_t0, // q
    eff_t0_r, // r
    eff_unimplemented_t0, // s
    eff_unimplemented_t0, // t
    eff_unimplemented_t0, // u
    eff_unimplemented_t0, // v
    eff_unimplemented_t0, // w
    eff_unimplemented_t0, // x
    eff_unimplemented_t0, // y
    eff_unimplemented_t0 // z
  ];

  player.effects_t1 = [
    // effect functions on tick 1+
    eff_t1_0,
    eff_t1_1,
    eff_t1_2,
    eff_t1_3,
    eff_t1_4,
    eff_t1_5, // 5
    eff_t1_6, // 6
    eff_unimplemented, // 7
    null, // 8
    null, // 9
    eff_t1_a, // a
    null, // b
    null, // c
    null, // d
    eff_t1_e, // e
    null, // f
    null, // g
    eff_t1_h, // h
    eff_unimplemented, // i
    eff_unimplemented, // j
    eff_unimplemented, // k
    eff_unimplemented, // l
    eff_unimplemented, // m
    eff_unimplemented, // n
    eff_unimplemented, // o
    eff_unimplemented, // p
    eff_unimplemented, // q
    eff_t1_r, // r
    eff_unimplemented, // s
    eff_unimplemented, // t
    eff_unimplemented, // u
    eff_unimplemented, // v
    eff_unimplemented, // w
    eff_unimplemented, // x
    eff_unimplemented, // y
    eff_unimplemented // z
  ];

  player.periodForNote = periodForNote;
  player.prettify_effect = prettify_effect;
  player.init = init;
  player.load = load;
  player.play = play;
  player.pause = pause;
  player.stop = stop;
  player.cur_songpos = -1;
  player.cur_pat = -1;
  player.cur_row = 64;
  player.cur_ticksamp = 0;
  player.cur_tick = 6;
  player.xm = {}; // contains all song data
  player.xm.global_volume = player.max_global_volume = 128;

  // exposed for testing
  player.nextTick = nextTick;
  player.nextRow = nextRow;
  player.Envelope = Envelope;

  // for pretty-printing notes
  const _note_names = [
    'C-',
    'C#',
    'D-',
    'D#',
    'E-',
    'F-',
    'F#',
    'G-',
    'G#',
    'A-',
    'A#',
    'B-'
  ];

  let f_smp = 44100; // updated by play callback, default value here

  // per-sample exponential moving average for volume changes (to prevent pops
  // and clicks); evaluated every 8 samples
  const popfilter_alpha = 0.9837;

  function prettify_note(note) {
    if (note < 0) return '---';
    if (note == 96) return '^^^';
    return _note_names[note % 12] + ~~(note / 12);
  }

  function prettify_number(num) {
    if (num == -1) return '--';
    if (num < 10) return '0' + num;
    return num;
  }

  function prettify_volume(num) {
    if (num < 0x10) return '--';
    return num.toString(16);
  }

  function prettify_effect(t, p) {
    if (t >= 10) t = String.fromCharCode(55 + t);
    if (p < 16) p = '0' + p.toString(16);
    else p = p.toString(16);
    return t + p;
  }

  function prettify_notedata(data) {
    return (
      prettify_note(data[0]) +
      ' ' +
      prettify_number(data[1]) +
      ' ' +
      prettify_volume(data[2]) +
      ' ' +
      prettify_effect(data[3], data[4])
    );
  }

  function getstring(dv, offset, len) {
    const str = [];
    for (let i = offset; i < offset + len; i++) {
      const c = dv.getUint8(i);
      if (c === 0) break;
      str.push(String.fromCharCode(c));
    }
    return str.join('');
  }

  // Return 2-pole Butterworth lowpass filter coefficients for
  // center frequncy f_c (relative to sampling frequency)
  function filterCoeffs(f_c) {
    if (f_c > 0.5) {
      // we can't lowpass above the nyquist frequency...
      f_c = 0.5;
    }
    const wct = Math.sqrt(2) * Math.PI * f_c;
    const e = Math.exp(-wct);
    const c = e * Math.cos(wct);
    const gain = (1 - 2 * c + e * e) / 2;
    return [gain, 2 * c, -e * e];
  }

  function updateChannelPeriod(ch, period) {
    const freq = 8363 * Math.pow(2, (1152.0 - period) / 192.0);
    if (isNaN(freq)) {
      debugLog('invalid period!', period);
      return;
    }
    ch.doff = freq / f_smp;
    ch.filter = filterCoeffs(ch.doff / 2);
  }

  function periodForNote(ch, note) {
    // channel was silenced (e.g. by a seek) and has no sample yet
    if (!ch.samp) return ch.period;
    return 1920 - (note + ch.samp.note) * 16 - ch.fine / 8.0;
  }

  function setCurrentPattern() {
    let nextPat = player.xm.songpats[player.cur_songpos];

    // check for out of range pattern index
    while (nextPat >= player.xm.patterns.length) {
      if (player.cur_songpos + 1 < player.xm.songpats.length) {
        // first try skipping the position
        player.cur_songpos++;
      } else if (
        (player.cur_songpos === player.xm.song_looppos &&
          player.cur_songpos !== 0) ||
        player.xm.song_looppos >= player.xm.songpats.length
      ) {
        // if we allready tried song_looppos or if song_looppos
        // is out of range, go to the first position
        player.cur_songpos = 0;
      } else {
        // try going to song_looppos
        player.cur_songpos = player.xm.song_looppos;
      }

      nextPat = player.xm.songpats[player.cur_songpos];
    }

    player.cur_pat = nextPat;
  }

  function nextRow() {
    if (typeof player.next_row === 'undefined') {
      player.next_row = player.cur_row + 1;
    }
    player.cur_row = player.next_row;
    player.next_row++;

    if (
      player.cur_pat == -1 ||
      player.cur_row >= player.xm.patterns[player.cur_pat].length
    ) {
      player.cur_row = 0;
      player.next_row = 1;
      player.cur_songpos++;
      if (player.cur_songpos >= player.xm.songpats.length) {
        player.cur_songpos = player.xm.song_looppos;
        if (player.onEnded) {
          setTimeout(() => {
            if (player.onEnded) player.onEnded();
          }, 0);
        }
      }
      setCurrentPattern();
    }
    const p = player.xm.patterns[player.cur_pat];
    if (!p) return;
    const r = p[player.cur_row];
    if (!r) return;
    for (let i = 0; i < r.length; i++) {
      const ch = player.xm.channelinfo[i];
      let inst = ch.inst;
      let triggernote = false;
      // instrument trigger
      if (r[i][1] != -1) {
        inst = player.xm.instruments[r[i][1] - 1];
        if (inst && inst.samplemap) {
          ch.inst = inst;
          // retrigger unless overridden below
          triggernote = true;
          if (ch.note && inst.samplemap) {
            ch.samp = inst.samples[inst.samplemap[ch.note]];
            ch.vol = ch.samp.vol;
            ch.pan = ch.samp.pan;
            ch.fine = ch.samp.fine;
          }
        } else {
          // debugLog("invalid inst", r[i][1], instruments.length);
        }
      }

      // note trigger
      if (r[i][0] != -1) {
        if (r[i][0] == 96) {
          ch.release = 1;
          triggernote = false;
        } else {
          if (inst && inst.samplemap) {
            const note = r[i][0];
            ch.note = note;
            ch.samp = inst.samples[inst.samplemap[ch.note]];
            if (triggernote) {
              // if we were already triggering the note, reset vol/pan using
              // (potentially) new sample
              ch.pan = ch.samp.pan;
              ch.vol = ch.samp.vol;
              ch.fine = ch.samp.fine;
            }
            triggernote = true;
          }
        }
      }

      ch.voleffectfn = undefined;
      if (r[i][2] != -1) {
        // volume column
        const v = r[i][2];
        ch.voleffectdata = v & 0x0f;
        if (v < 0x10) {
          debugLog('channel', i, 'invalid volume', v.toString(16));
        } else if (v <= 0x50) {
          ch.vol = v - 0x10;
        } else if (v >= 0x60 && v < 0x70) {
          // volume slide down
          ch.voleffectfn = function (ch) {
            ch.vol = Math.max(0, ch.vol - ch.voleffectdata);
          };
        } else if (v >= 0x70 && v < 0x80) {
          // volume slide up
          ch.voleffectfn = function (ch) {
            ch.vol = Math.min(64, ch.vol + ch.voleffectdata);
          };
        } else if (v >= 0x80 && v < 0x90) {
          // fine volume slide down
          ch.vol = Math.max(0, ch.vol - (v & 0x0f));
        } else if (v >= 0x90 && v < 0xa0) {
          // fine volume slide up
          ch.vol = Math.min(64, ch.vol + (v & 0x0f));
        } else if (v >= 0xa0 && v < 0xb0) {
          // vibrato speed
          ch.vibratospeed = v & 0x0f;
        } else if (v >= 0xb0 && v < 0xc0) {
          // vibrato w/ depth
          ch.vibratodepth = v & 0x0f;
          ch.voleffectfn = player.effects_t1[4]; // use vibrato effect directly
          player.effects_t1[4](ch); // and also call it on tick 0
        } else if (v >= 0xc0 && v < 0xd0) {
          // set panning
          ch.pan = (v & 0x0f) * 0x11;
        } else if (v >= 0xf0 && v <= 0xff) {
          // portamento
          if (v & 0x0f) {
            ch.portaspeed = (v & 0x0f) << 4;
          }
          ch.voleffectfn = player.effects_t1[3]; // just run 3x0
        } else {
          debugLog('channel', i, 'volume effect', v.toString(16));
        }
      }

      ch.effect = r[i][3];
      ch.effectdata = r[i][4];
      if (ch.effect < 36) {
        ch.effectfn = player.effects_t1[ch.effect];
        const eff_t0 = player.effects_t0[ch.effect];
        if (eff_t0 && eff_t0(ch, ch.effectdata)) {
          triggernote = false;
        }
      } else {
        debugLog('channel', i, 'effect > 36', ch.effect);
      }

      // special handling for portamentos: don't trigger the note
      if (ch.effect == 3 || ch.effect == 5 || r[i][2] >= 0xf0) {
        if (r[i][0] != -1) {
          ch.periodtarget = periodForNote(ch, ch.note);
        }
        triggernote = false;
        if (inst && inst.samplemap) {
          if (ch.env_vol == undefined) {
            // note wasn't already playing; we basically have to ignore the
            // portamento and just trigger
            triggernote = true;
          } else if (ch.release) {
            // reset envelopes if note was released but leave offset/pitch/etc
            // alone
            ch.envtick = 0;
            ch.release = 0;
            ch.env_vol = new EnvelopeFollower(inst.env_vol);
            ch.env_pan = new EnvelopeFollower(inst.env_pan);
          }
        }
      }

      if (triggernote) {
        // there's gotta be a less hacky way to handle offset commands...
        if (ch.effect != 9) ch.off = 0;
        ch.release = 0;
        ch.envtick = 0;
        ch.env_vol = new EnvelopeFollower(inst.env_vol);
        ch.env_pan = new EnvelopeFollower(inst.env_pan);
        if (ch.note) {
          ch.period = periodForNote(ch, ch.note);
        }
        // waveforms 0-3 are retriggered on new notes while 4-7 are continuous
        if (ch.vibratotype < 4) {
          ch.vibratopos = 0;
        }
      }
    }
  }

  function Envelope(points, type, sustain, loopstart, loopend) {
    this.points = points;
    this.type = type;
    this.sustain = sustain;
    this.loopstart = points[loopstart * 2];
    this.loopend = points[loopend * 2];
  }

  Envelope.prototype.Get = function (ticks) {
    // TODO: optimize follower with ptr
    // or even do binary search here
    let y0;
    const env = this.points;
    for (let i = 0; i < env.length; i += 2) {
      y0 = env[i + 1];
      if (ticks < env[i]) {
        const x0 = env[i - 2];
        y0 = env[i - 1];
        const dx = env[i] - x0;
        const dy = env[i + 1] - y0;
        return y0 + ((ticks - x0) * dy) / dx;
      }
    }
    return y0;
  };

  function EnvelopeFollower(env) {
    this.env = env;
    this.tick = 0;
  }

  EnvelopeFollower.prototype.Tick = function (release) {
    const value = this.env.Get(this.tick);

    // if we're sustaining a note, stop advancing the tick counter
    if (!release && this.tick >= this.env.points[this.env.sustain * 2]) {
      return this.env.points[this.env.sustain * 2 + 1];
    }

    this.tick++;
    if (this.env.type & 4) {
      // envelope loop?
      if (!release && this.tick >= this.env.loopend) {
        this.tick -= this.env.loopend - this.env.loopstart;
      }
    }
    return value;
  };

  function nextTick() {
    player.cur_tick++;
    let j, ch;
    for (j = 0; j < player.xm.nchan; j++) {
      ch = player.xm.channelinfo[j];
      ch.periodoffset = 0;
    }
    if (player.cur_tick >= player.xm.tempo) {
      player.cur_tick = 0;
      nextRow();
    }
    for (j = 0; j < player.xm.nchan; j++) {
      ch = player.xm.channelinfo[j];
      const inst = ch.inst;
      if (player.cur_tick !== 0) {
        if (ch.voleffectfn) ch.voleffectfn(ch);
        if (ch.effectfn) ch.effectfn(ch);
      }
      if (isNaN(ch.period)) {
        debugLog(
          prettify_notedata(
            player.xm.patterns[player.cur_pat][player.cur_row][j]
          ),
          'set channel',
          j,
          'period to NaN'
        );
      }
      if (inst === undefined) continue;
      if (ch.env_vol === undefined) {
        debugLog(
          prettify_notedata(
            player.xm.patterns[player.cur_pat][player.cur_row][j]
          ),
          'set channel',
          j,
          'env_vol to undefined, but note is playing'
        );
        continue;
      }
      ch.volE = ch.env_vol.Tick(ch.release);
      ch.panE = ch.env_pan.Tick(ch.release);
      updateChannelPeriod(ch, ch.period + ch.periodoffset);
    }
  }

  // This function gradually brings the channel back down to zero if it isn't
  // already to avoid clicks and pops when samples end.
  function MixSilenceIntoBuf(ch, start, end, dataL, dataR) {
    let s = ch.filterstate[1];
    if (isNaN(s)) {
      debugLog('NaN filterstate?', ch.filterstate, ch.filter);
      return;
    }
    for (var i = start; i < end; i++) {
      if (Math.abs(s) < 1.526e-5) {
        // == 1/65536.0
        s = 0;
        break;
      }
      dataL[i] += s * ch.vL;
      dataR[i] += s * ch.vR;
      s *= popfilter_alpha;
    }
    ch.filterstate[1] = s;
    ch.filterstate[2] = s;
    if (isNaN(s)) {
      debugLog(
        'NaN filterstate after adding silence?',
        ch.filterstate,
        ch.filter,
        i
      );
      return;
    }
    return 0;
  }

  function MixChannelIntoBuf(ch, start, end, dataL, dataR) {
    const inst = ch.inst;
    const instsamp = ch.samp;
    let loop = false;
    let looplen = 0,
      loopstart = 0;

    // nothing on this channel, just filter the last dc offset back down to zero
    if (instsamp == undefined || inst == undefined || ch.mute) {
      return MixSilenceIntoBuf(ch, start, end, dataL, dataR);
    }

    const samp = instsamp.sampledata;
    let sample_end = instsamp.len;
    if ((instsamp.type & 3) == 1 && instsamp.looplen > 0) {
      loop = true;
      loopstart = instsamp.loop;
      looplen = instsamp.looplen;
      sample_end = loopstart + looplen;
    }
    const samplen = instsamp.len;
    const volE = ch.volE / 64.0; // current volume envelope
    const panE = 4 * (ch.panE - 32); // current panning envelope
    const p = panE + ch.pan - 128; // final pan
    let volL =
      (player.xm.global_volume * volE * (128 - p) * ch.vol) / (64 * 128 * 128);
    let volR =
      (player.xm.global_volume * volE * (128 + p) * ch.vol) / (64 * 128 * 128);
    if (volL < 0) volL = 0;
    if (volR < 0) volR = 0;
    if (volR === 0 && volL === 0) return;
    if (isNaN(volR) || isNaN(volL)) {
      debugLog('NaN volume!?', ch.number, volL, volR, volE, panE, ch.vol);
      return;
    }
    let k = ch.off;
    const dk = ch.doff;
    let Vrms = 0;
    const f0 = ch.filter[0],
      f1 = ch.filter[1],
      f2 = ch.filter[2];
    let fs0 = ch.filterstate[0],
      fs1 = ch.filterstate[1],
      fs2 = ch.filterstate[2];

    // we also low-pass filter volume changes with a simple one-zero,
    // one-pole filter to avoid pops and clicks when volume changes.
    let vL =
      popfilter_alpha * ch.vL +
      (1 - popfilter_alpha) * (volL + ch.vLprev) * 0.5;
    let vR =
      popfilter_alpha * ch.vR +
      (1 - popfilter_alpha) * (volR + ch.vRprev) * 0.5;
    const pf_8 = Math.pow(popfilter_alpha, 8);
    ch.vLprev = volL;
    ch.vRprev = volR;

    // we can mix up to this many bytes before running into a sample end/loop
    let i = start;
    let failsafe = 100;
    while (i < end) {
      if (failsafe-- === 0) {
        debugLog(
          'failsafe in mixing loop! channel',
          ch.number,
          k,
          sample_end,
          loopstart,
          looplen,
          dk
        );
        break;
      }
      if (k >= sample_end) {
        // TODO: implement pingpong looping
        if (loop) {
          k = loopstart + ((k - loopstart) % looplen);
        } else {
          // kill sample
          ch.inst = undefined;
          // fill rest of buf with filtered dc offset using loop above
          return Vrms + MixSilenceIntoBuf(ch, i, end, dataL, dataR);
        }
      }
      const next_event = Math.max(1, Math.min(end, i + (sample_end - k) / dk));
      // this is the inner loop of the player

      // unrolled 8x
      var s, y;
      for (; i + 7 < next_event; i += 8) {
        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i] += vL * y;
        dataR[i] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 1] += vL * y;
        dataR[i + 1] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 2] += vL * y;
        dataR[i + 2] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 3] += vL * y;
        dataR[i + 3] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 4] += vL * y;
        dataR[i + 4] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 5] += vL * y;
        dataR[i + 5] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 6] += vL * y;
        dataR[i + 6] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 7] += vL * y;
        dataR[i + 7] += vR * y;
        Vrms += (vL + vR) * y * y;

        vL = pf_8 * vL + (1 - pf_8) * volL;
        vR = pf_8 * vR + (1 - pf_8) * volR;
      }

      for (; i < next_event; i++) {
        s = samp[k | 0];
        // we low-pass filter here since we are resampling some arbitrary
        // frequency to f_smp; this is an anti-aliasing filter and is
        // implemented as an IIR butterworth filter (usually we'd use an FIR
        // brick wall filter, but this is much simpler computationally and
        // sounds fine)
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        dataL[i] += vL * y;
        dataR[i] += vR * y;
        Vrms += (vL + vR) * y * y;
        k += dk;
      }
    }
    ch.off = k;
    ch.filterstate[0] = fs0;
    ch.filterstate[1] = fs1;
    ch.filterstate[2] = fs2;
    ch.vL = vL;
    ch.vR = vR;
    return Vrms * 0.5;
  }

  function audio_cb(e) {
    f_smp = player.audioctx.sampleRate;
    let time_sound_started;
    let buflen = e.outputBuffer.length;
    const dataL = e.outputBuffer.getChannelData(0);
    const dataR = e.outputBuffer.getChannelData(1);
    let i, j, k;

    for (i = 0; i < buflen; i++) {
      dataL[i] = 0;
      dataR[i] = 0;
    }

    let offset = 0;
    const ticklen = 0 | ((f_smp * 2.5) / player.xm.bpm);
    const scopewidth = XMView.scope_width;

    while (buflen > 0) {
      if (player.cur_pat == -1 || player.cur_ticksamp >= ticklen) {
        nextTick(f_smp);
        player.cur_ticksamp -= ticklen;
      }
      const tickduration = Math.min(buflen, ticklen - player.cur_ticksamp);
      const VU = new Float32Array(player.xm.nchan);
      let scopes = undefined;
      for (j = 0; j < player.xm.nchan; j++) {
        var scope;
        if (tickduration >= 4 * scopewidth) {
          scope = new Float32Array(scopewidth);
          for (k = 0; k < scopewidth; k++) {
            scope[k] = -dataL[offset + k * 4] - dataR[offset + k * 4];
          }
        }

        VU[j] =
          MixChannelIntoBuf(
            player.xm.channelinfo[j],
            offset,
            offset + tickduration,
            dataL,
            dataR
          ) / tickduration;

        if (tickduration >= 4 * scopewidth) {
          for (k = 0; k < scopewidth; k++) {
            scope[k] += dataL[offset + k * 4] + dataR[offset + k * 4];
          }
          if (scopes === undefined) scopes = [];
          scopes.push(scope);
        }
      }
      if (XMView.pushEvent) {
        XMView.pushEvent({
          t: e.playbackTime + (0.0 + offset) / f_smp,
          vu: VU,
          scopes: scopes,
          songpos: player.cur_songpos,
          pat: player.cur_pat,
          row: player.cur_row
        });
      }
      offset += tickduration;
      player.cur_ticksamp += tickduration;
      buflen -= tickduration;
    }
  }

  function ConvertSample(array, bits) {
    let len = array.length;
    let acc = 0;
    let samp, b, k;
    if (bits === 0) {
      // 8 bit sample
      samp = new Float32Array(len);
      for (k = 0; k < len; k++) {
        acc += array[k];
        b = acc & 255;
        if (b & 128) b = b - 256;
        samp[k] = b / 128.0;
      }
      return samp;
    } else {
      len /= 2;
      samp = new Float32Array(len);
      for (k = 0; k < len; k++) {
        b = array[k * 2] + (array[k * 2 + 1] << 8);
        if (b & 32768) b = b - 65536;
        acc = Math.max(-1, Math.min(1, acc + b / 32768.0));
        samp[k] = acc;
      }
      return samp;
    }
  }

  // optimization: unroll short sample loops so we can run our inner mixing loop
  // uninterrupted for as long as possible; this also handles pingpong loops.
  function UnrollSampleLoop(samp) {
    let nloops = ((2048 + samp.looplen - 1) / samp.looplen) | 0;
    const pingpong = samp.type & 2;
    if (pingpong) {
      // make sure we have an even number of loops if we are pingponging
      nloops = (nloops + 1) & ~1;
    }
    const samplesiz = samp.loop + nloops * samp.looplen;
    const data = new Float32Array(samplesiz);
    for (var i = 0; i < samp.loop; i++) {
      data[i] = samp.sampledata[i];
    }
    for (let j = 0; j < nloops; j++) {
      var k;
      if (j & 1 && pingpong) {
        for (k = samp.looplen - 1; k >= 0; k--) {
          data[i++] = samp.sampledata[samp.loop + k];
        }
      } else {
        for (k = 0; k < samp.looplen; k++) {
          data[i++] = samp.sampledata[samp.loop + k];
        }
      }
    }
    debugLog(
      'unrolled sample loop; looplen',
      samp.looplen,
      'x',
      nloops,
      ' = ',
      samplesiz
    );
    samp.sampledata = data;
    samp.looplen = nloops * samp.looplen;
    samp.type = 1;
  }

  function load(arrayBuf) {
    const dv = new DataView(arrayBuf);
    player.xm = {};

    player.xm.songname = getstring(dv, 17, 20);
    const hlen = dv.getUint32(0x3c, true) + 0x3c;
    const songlen = dv.getUint16(0x40, true);
    player.xm.song_looppos = dv.getUint16(0x42, true);
    player.xm.nchan = dv.getUint16(0x44, true);
    const npat = dv.getUint16(0x46, true);
    const ninst = dv.getUint16(0x48, true);
    player.xm.flags = dv.getUint16(0x4a, true);
    player.xm.tempo = dv.getUint16(0x4c, true);
    player.xm.bpm = dv.getUint16(0x4e, true);
    player.xm.initial_tempo = player.xm.tempo;
    player.xm.initial_bpm = player.xm.bpm;
    player.xm.channelinfo = [];
    player.xm.global_volume = player.max_global_volume;

    let i, j, k;

    for (i = 0; i < player.xm.nchan; i++) {
      player.xm.channelinfo.push({
        number: i,
        filterstate: new Float32Array(3),
        vol: 0,
        pan: 128,
        period: 1920 - 48 * 16,
        vL: 0,
        vR: 0, // left right volume envelope followers (changes per sample)
        vLprev: 0,
        vRprev: 0,
        mute: 0,
        volE: 0,
        panE: 0,
        retrig: 0,
        vibratopos: 0,
        vibratodepth: 1,
        vibratospeed: 1,
        vibratotype: 0
      });
    }
    debugLog('header len ' + hlen);

    debugLog(
      'songlen %d, %d channels, %d patterns, %d instruments',
      songlen,
      player.xm.nchan,
      npat,
      ninst
    );
    debugLog('loop @%d', player.xm.song_looppos);
    debugLog(
      'flags=%d tempo %d bpm %d',
      player.xm.flags,
      player.xm.tempo,
      player.xm.bpm
    );

    player.xm.songpats = [];
    for (i = 0; i < songlen; i++) {
      player.xm.songpats.push(dv.getUint8(0x50 + i));
    }
    debugLog('song patterns: ', player.xm.songpats);

    let idx = hlen;
    player.xm.patterns = [];
    for (i = 0; i < npat; i++) {
      const pattern = [];
      const patheaderlen = dv.getUint32(idx, true);
      const patrows = dv.getUint16(idx + 5, true);
      const patsize = dv.getUint16(idx + 7, true);
      debugLog('pattern %d: %d bytes, %d rows', i, patsize, patrows);
      idx += 9;
      for (j = 0; patsize > 0 && j < patrows; j++) {
        const row = [];
        for (k = 0; k < player.xm.nchan; k++) {
          const byte0 = dv.getUint8(idx);
          idx++;
          var note = -1,
            inst = -1,
            vol = -1,
            efftype = 0,
            effparam = 0;
          if (byte0 & 0x80) {
            if (byte0 & 0x01) {
              note = dv.getUint8(idx) - 1;
              idx++;
            }
            if (byte0 & 0x02) {
              inst = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x04) {
              vol = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x08) {
              efftype = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x10) {
              effparam = dv.getUint8(idx);
              idx++;
            }
          } else {
            // byte0 is note from 1..96 or 0 for nothing or 97 for release
            // so we subtract 1 so that C-0 is stored as 0
            note = byte0 - 1;
            inst = dv.getUint8(idx);
            idx++;
            vol = dv.getUint8(idx);
            idx++;
            efftype = dv.getUint8(idx);
            idx++;
            effparam = dv.getUint8(idx);
            idx++;
          }
          const notedata = [note, inst, vol, efftype, effparam];
          row.push(notedata);
        }
        pattern.push(row);
      }
      player.xm.patterns.push(pattern);
    }

    player.xm.instruments = [];
    // now load instruments
    for (i = 0; i < ninst; i++) {
      const hdrsiz = dv.getUint32(idx, true);
      const instname = getstring(dv, idx + 0x4, 22);
      const nsamp = dv.getUint16(idx + 0x1b, true);
      var inst = {
        name: instname,
        number: i
      };
      if (nsamp > 0) {
        const samplemap = new Uint8Array(arrayBuf, idx + 33, 96);

        const env_nvol = dv.getUint8(idx + 225);
        const env_vol_type = dv.getUint8(idx + 233);
        let env_vol_sustain = dv.getUint8(idx + 227);
        const env_vol_loop_start = dv.getUint8(idx + 228);
        const env_vol_loop_end = dv.getUint8(idx + 229);
        const env_npan = dv.getUint8(idx + 226);
        const env_pan_type = dv.getUint8(idx + 234);
        let env_pan_sustain = dv.getUint8(idx + 230);
        const env_pan_loop_start = dv.getUint8(idx + 231);
        const env_pan_loop_end = dv.getUint8(idx + 232);
        const vol_fadeout = dv.getUint16(idx + 239, true);
        const env_vol = [];
        for (j = 0; j < env_nvol * 2; j++) {
          env_vol.push(dv.getUint16(idx + 129 + j * 2, true));
        }
        const env_pan = [];
        for (j = 0; j < env_npan * 2; j++) {
          env_pan.push(dv.getUint16(idx + 177 + j * 2, true));
        }
        // FIXME: ignoring keymaps for now and assuming 1 sample / instrument
        // var keymap = getarray(dv, idx+0x21);
        const samphdrsiz = dv.getUint32(idx + 0x1d, true);
        debugLog(
          "hdrsiz %d; instrument %s: '%s' %d samples, samphdrsiz %d",
          hdrsiz,
          (i + 1).toString(16),
          instname,
          nsamp,
          samphdrsiz
        );
        idx += hdrsiz;
        let totalsamples = 0;
        const samps = [];
        for (j = 0; j < nsamp; j++) {
          const samplen = dv.getUint32(idx, true);
          const samploop = dv.getUint32(idx + 4, true);
          const samplooplen = dv.getUint32(idx + 8, true);
          const sampvol = dv.getUint8(idx + 12);
          const sampfinetune = dv.getInt8(idx + 13);
          let samptype = dv.getUint8(idx + 14);
          const samppan = dv.getUint8(idx + 15);
          const sampnote = dv.getInt8(idx + 16);
          const sampname = getstring(dv, idx + 18, 22);
          const sampleoffset = totalsamples;
          if (samplooplen === 0) {
            samptype &= ~3;
          }
          debugLog(
            "sample %d: len %d name '%s' loop %d/%d vol %d offset %s",
            j,
            samplen,
            sampname,
            samploop,
            samplooplen,
            sampvol,
            sampleoffset.toString(16)
          );
          debugLog(
            '           type %d note %s(%d) finetune %d pan %d',
            samptype,
            prettify_note(sampnote + 12 * 4),
            sampnote,
            sampfinetune,
            samppan
          );
          debugLog(
            '           vol env',
            env_vol,
            env_vol_sustain,
            env_vol_loop_start,
            env_vol_loop_end,
            'type',
            env_vol_type,
            'fadeout',
            vol_fadeout
          );
          debugLog(
            '           pan env',
            env_pan,
            env_pan_sustain,
            env_pan_loop_start,
            env_pan_loop_end,
            'type',
            env_pan_type
          );
          var samp = {
            len: samplen,
            loop: samploop,
            looplen: samplooplen,
            note: sampnote,
            fine: sampfinetune,
            pan: samppan,
            type: samptype,
            vol: sampvol,
            fileoffset: sampleoffset
          };
          // length / pointers are all specified in bytes; fixup for 16-bit samples
          samps.push(samp);
          idx += samphdrsiz;
          totalsamples += samplen;
        }
        for (j = 0; j < nsamp; j++) {
          var samp = samps[j];
          samp.sampledata = ConvertSample(
            new Uint8Array(arrayBuf, idx + samp.fileoffset, samp.len),
            samp.type & 16
          );
          if (samp.type & 16) {
            samp.len /= 2;
            samp.loop /= 2;
            samp.looplen /= 2;
          }
          // unroll short loops and any pingpong loops
          if (samp.type & 3 && (samp.looplen < 2048 || samp.type & 2)) {
            UnrollSampleLoop(samp);
          }
        }
        idx += totalsamples;
        inst.samplemap = samplemap;
        inst.samples = samps;
        if (env_vol_type) {
          // insert an automatic fadeout to 0 at the end of the envelope
          const env_end_tick = env_vol[env_vol.length - 2];
          if (!(env_vol_type & 2)) {
            // if there's no sustain point, create one
            env_vol_sustain = env_vol.length / 2;
          }
          if (vol_fadeout > 0) {
            const fadeout_ticks = 65536.0 / vol_fadeout;
            env_vol.push(env_end_tick + fadeout_ticks);
            env_vol.push(0);
          }
          inst.env_vol = new Envelope(
            env_vol,
            env_vol_type,
            env_vol_sustain,
            env_vol_loop_start,
            env_vol_loop_end
          );
        } else {
          // no envelope, then just make a default full-volume envelope.
          // i thought this would use fadeout, but apparently it doesn't.
          inst.env_vol = new Envelope([0, 64, 1, 0], 2, 0, 0, 0);
        }
        if (env_pan_type) {
          if (!(env_pan_type & 2)) {
            // if there's no sustain point, create one
            env_pan_sustain = env_pan.length / 2;
          }
          inst.env_pan = new Envelope(
            env_pan,
            env_pan_type,
            env_pan_sustain,
            env_pan_loop_start,
            env_pan_loop_end
          );
        } else {
          // create a default empty envelope
          inst.env_pan = new Envelope([0, 32], 0, 0, 0, 0);
        }
      } else {
        idx += hdrsiz;
        debugLog('empty instrument', i, hdrsiz, idx);
      }
      player.xm.instruments.push(inst);
    }

    debugLog('loaded "' + player.xm.songname + '"');
    return true;
  }

  var jsNode, gainNode;
  function init(existingCtx, bufferSize) {
    if (existingCtx) {
      player.audioctx = existingCtx;
    } else if (!player.audioctx && typeof window !== 'undefined') {
      const audioContext = window.AudioContext || window.webkitAudioContext;
      if (audioContext) player.audioctx = new audioContext();
    }
    if (!player.audioctx) return null;

    const bSize = bufferSize || 4096;
    gainNode = player.audioctx.createGain();
    gainNode.gain.value = 1.0;
    if (player.audioctx.createScriptProcessor === undefined) {
      jsNode = player.audioctx.createJavaScriptNode(bSize, 0, 2);
    } else {
      jsNode = player.audioctx.createScriptProcessor(bSize, 0, 2);
    }
    jsNode.onaudioprocess = audio_cb;
    return gainNode;
  }

  player.playing = false;
  function play() {
    if (!player.playing) {
      // put paused events back into action, if any
      if (XMView.resume) XMView.resume();
      // start playing
      jsNode.connect(gainNode);

      try {
        if (player.audioctx && player.audioctx.createOscillator) {
          const temp_osc = player.audioctx.createOscillator();
          temp_osc.connect(player.audioctx.destination);
          if (temp_osc.start) temp_osc.start(0);
          if (temp_osc.stop) temp_osc.stop(0);
          temp_osc.disconnect();
        }
      } catch (e) {
        // Ignore oscillator hack failure on headless / mocked environments
      }
    }
    player.playing = true;
  }

  function pause() {
    if (player.playing) {
      jsNode.disconnect(gainNode);
      if (XMView.pause) XMView.pause();
    }
    player.playing = false;
  }

  function stop() {
    if (player.playing && jsNode && gainNode) {
      try {
        jsNode.disconnect(gainNode);
      } catch {
        // Disconnect can throw if not connected
      }
      player.playing = false;
    }
    player.cur_pat = -1;
    player.cur_row = 64;
    player.cur_songpos = -1;
    player.cur_ticksamp = 0;
    player.xm.global_volume = player.max_global_volume;
    if (XMView.stop) XMView.stop();
  }

  player.getGainNode = function () {
    return gainNode;
  };

  player.getJsNode = function () {
    return jsNode;
  };

  player.setCurrentPattern = setCurrentPattern;

  // Cut every voice and clear per-channel effect state, so notes started
  // before a jump don't keep ringing (their note-offs are never reached).
  player.silenceChannels = function () {
    const channels = player.xm.channelinfo || [];
    for (const ch of channels) {
      ch.inst = undefined;
      ch.samp = undefined;
      ch.env_vol = undefined;
      ch.env_pan = undefined;
      ch.voleffectfn = undefined;
      ch.effectfn = undefined;
      ch.release = 0;
      ch.volE = 0;
      ch.panE = 0;
      ch.retrig = 0;
      ch.periodoffset = 0;
    }
    player.xm.global_volume = player.max_global_volume;
    player.xm.global_volumeslide = undefined;
    player.xm.tempo = player.xm.initial_tempo;
    player.xm.bpm = player.xm.initial_bpm;
  };

  return player;
}

export class XMPlayer {
  private engine: any;
  public audioctx: AudioContext | null = null;
  public outputNode: GainNode | null = null;
  private bufferSize: number;
  public onEnded?: () => void;

  constructor(options?: XMPlayerOptions) {
    this.bufferSize = options?.bufferSize || 4096;
    this.onEnded = options?.onEnded;
    this.engine = createXMEngine();
    this.engine.onEnded = () => {
      if (this.onEnded) this.onEnded();
    };
  }

  get isPlaying(): boolean {
    return !!this.engine.playing;
  }

  get songTitle(): string {
    return (this.engine.xm?.songname || '').trim();
  }

  get numChannels(): number {
    return this.engine.xm?.nchan || 0;
  }

  init(ctx?: AudioContext): GainNode | null {
    this.audioctx = ctx || null;
    const gain = this.engine.init(ctx, this.bufferSize);
    this.outputNode = gain;
    return gain;
  }

  async loadUrl(url: string): Promise<boolean> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to load XM file: HTTP ' + res.status);
    }
    const buf = await res.arrayBuffer();
    return this.loadBuffer(buf);
  }

  loadBuffer(buf: ArrayBuffer): boolean {
    this.stop();
    return this.engine.load(buf);
  }

  play(): void {
    this.engine.play();
  }

  pause(): void {
    this.engine.pause();
  }

  stop(): void {
    this.engine.stop();
  }

  setVolume(vol: number): void {
    const gain = this.engine.getGainNode();
    if (gain && gain.gain) {
      gain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  getProgress(): number {
    if (!this.engine.xm || !this.engine.xm.songpats) return 0;
    if (this.engine.cur_songpos < 0) return 0;
    const totalPats = this.engine.xm.songpats.length;
    if (totalPats === 0) return 0;
    const curPos = Math.max(0, this.engine.cur_songpos);
    const curRow = Math.max(0, Math.min(63, this.engine.cur_row));
    const progress = ((curPos * 64 + curRow) / (totalPats * 64)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  seek(percent: number): void {
    if (!this.engine.xm || !this.engine.xm.songpats) return;
    const totalPats = this.engine.xm.songpats.length;
    if (totalPats === 0) return;
    const targetIdx = Math.floor(
      Math.max(0, Math.min(0.999, percent)) * totalPats
    );
    this.engine.cur_songpos = targetIdx;
    this.engine.silenceChannels();
    this.engine.cur_row = 0;
    this.engine.next_row = 0;
    this.engine.cur_ticksamp = 0;
    // start on the last tick so the next one wraps to row 0 and triggers it
    this.engine.cur_tick = this.engine.xm.tempo - 1;
    this.engine.setCurrentPattern();
  }
}
