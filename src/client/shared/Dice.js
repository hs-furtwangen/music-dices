import * as soundworks from 'soundworks/client';
import { centToLinear } from 'soundworks/utils/math';

const audioContext = soundworks.audioContext;

const releaseTime = 0.100;
const attackTime = 0.003;
const bpm = 128;
const measuresInPattern = 4;
const beatsPerMeasure = 4;
const beatDuration = 60 / bpm;
const sixteenthBeatDuration = beatDuration / 4;
const patternDuration = measuresInPattern * beatsPerMeasure * beatDuration;

class Dice {
  constructor(sync, buffers) {
    this.sync = sync;
    this.buffers = buffers;
    this.bufferSource = null;
    this.gain = null;
  }

  stopSound(time = audioContext.currentTime) {
    let bufferSource = this.bufferSource;
    let gain = this.gain;

    if (bufferSource) {
      bufferSource.stop(time + releaseTime);
      gain.gain.setValueAtTime(1, time);
      gain.gain.linearRampToValueAtTime(0, time + releaseTime);

      this.bufferSource = null;
      this.gain = null;
    }
  }

  startSound(edge, transpose = 0) {
    const audioTime = audioContext.currentTime;
    const syncTime = this.sync.getSyncTime(audioTime);
    const numSixteenthBeats = Math.ceil(syncTime / sixteenthBeatDuration);
    const quantizedSyncTime = numSixteenthBeats * sixteenthBeatDuration;
    const quantizedAudioTime = this.sync.getAudioTime(quantizedSyncTime);
    const startTime = quantizedSyncTime % patternDuration; // start time within pattern
    let bufferSource = this.bufferSource;
    let gain = this.gain;

    this.stopSound(quantizedAudioTime);

    // start playback
    gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, quantizedAudioTime);
    gain.gain.linearRampToValueAtTime(1, quantizedAudioTime + attackTime);

    bufferSource = audioContext.createBufferSource();
    bufferSource.connect(gain);
    bufferSource.buffer = this.buffers[edge - 1];
    bufferSource.playbackRate.value = centToLinear(transpose);
    bufferSource.start(quantizedAudioTime, startTime);
    bufferSource.loop = true;
    bufferSource.loopStart = 0;
    bufferSource.loopEnd = patternDuration;

    this.bufferSource = bufferSource;
    this.gain = gain;
  }
}

export default Dice;