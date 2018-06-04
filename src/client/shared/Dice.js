import * as soundworks from 'soundworks/client';
import { centToLinear, decibelToLinear } from 'soundworks/utils/math';

const audioContext = soundworks.audioContext;

const attackTime = 0.003;

const defaultMetrics = {
  tempo: 120,
  ticksPerMeasure: 16,
  measuresInPattern: 4,
};

class Dice {
  constructor(sync, buffers, duration, quantization, destination = audioContext.destination) {
    this.sync = sync;
    this.buffers = buffers;
    this.duration = duration;
    this.quantization = quantization;
    this.destination = destination;
    this.delay = 0;
    this.amp = 1;

    this.bufferSource = null;
    this.gain = null;
    this.releaseStart = -Infinity;
    this.releaseEnd = -Infinity;
    this.running = false;
    this.edge = 0;
  }

  _startSound(audioTime, edge, transpose = 0) {
    const syncTime = this.sync.getSyncTime(audioTime);
    const numTicks = Math.ceil(syncTime / this.quantization);
    const quantizedSyncTime = numTicks * this.quantization;
    const quantizedAudioTime = this.sync.getAudioTime(quantizedSyncTime) + this.delay;
    const startTime = quantizedSyncTime % this.duration; // start time within pattern
    let bufferSource = this.bufferSource;
    let gain = this.gain;

    this._stopSound(quantizedAudioTime, attackTime);

    gain = audioContext.createGain();
    gain.connect(this.destination);
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, quantizedAudioTime);
    gain.gain.linearRampToValueAtTime(this.amp, quantizedAudioTime + attackTime);

    bufferSource = audioContext.createBufferSource();
    bufferSource.connect(gain);
    bufferSource.buffer = this.buffers[edge - 1];
    bufferSource.playbackRate.value = centToLinear(transpose);
    bufferSource.start(quantizedAudioTime, startTime);
    bufferSource.loop = true;
    bufferSource.loopStart = 0;
    bufferSource.loopEnd = this.duration;

    this.bufferSource = bufferSource;
    this.gain = gain;
    this.releaseStart = Infinity;
    this.releaseEnd = Infinity;
  }

  _stopSound(audioTime, releaseTime = 0.1) {
    const releaseEnd = audioTime + releaseTime;

    if (releaseEnd < this.releaseEnd) {
      let ratio = 0;

      if (audioTime > this.releaseStart)
        ratio = (audioTime - this.releaseStart) / (this.releaseEnd - this.releaseStart);

      const factor = 1 - ratio;
      const bufferSource = this.bufferSource;
      const gain = this.gain;

      if (bufferSource) {
        bufferSource.stop(audioTime + releaseTime);
        this.bufferSource = null;
      }

      gain.gain.setValueAtTime(factor * this.amp, audioTime);
      gain.gain.linearRampToValueAtTime(0, releaseEnd);

      this.releaseStart = audioTime - ratio * releaseTime;
      this.releaseEnd = releaseEnd;
    } else {
      this.bufferSource = null;
      this.gain = null;
      this.releaseStart = -Infinity;
      this.releaseEnd = -Infinity;
    }
  }

  set edge(value) {
    if (value !== this.edge) {
      this._edge = value;

      if (this.running) {
        const audioTime = audioContext.currentTime;
        this._startSound(audioTime, value);
      }
    }
  }

  get edge() {
    return this._edge;
  }

  set level(value) {
    this.amp = decibelToLinear(value);
  }

  start() {
    const audioTime = audioContext.currentTime;
    this._startSound(audioTime, this._edge);
    this.running = true;
  }

  stop(releaseTime = 0.1) {
    const audioTime = audioContext.currentTime;
    this._stopSound(audioTime, releaseTime);
    this.running = false;
  }
}

export default Dice;