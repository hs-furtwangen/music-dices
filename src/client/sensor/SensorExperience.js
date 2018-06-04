import * as soundworks from 'soundworks/client';
import audioFiles from '../shared/audioFiles.js';
import Dice from '../shared/Dice.js';

const audioContext = soundworks.audioContext;

const stillAccLowThreshold = 0.4;
const freeFallAccThreshold = 3;
const freeFallDurationThreshold = 0.2;
const freeTurnGyroHighThreshold = 200;
const freeTurnGyroDiffLowThreshold = 0.02;
const freeTurnDurationThreshold = 0.2;
const interHitTimeHighThreshold = 0.5;

const template = `
  <div class="title">sensor</div>
  <div id="edge" class="center"><%= edge %></p></div>
`;

const model = {
  edge: '',
};

function getCurrentTime() {
  return 0.001 * performance.now();
}

class Lowpass {
  constructor(period, cutoff = 10) {
    this.k = 0;
    this.output = [0, 0, 0];

    this.period = period; // period in sec
    this.setCutoff(cutoff); // cutoff frequency in Hz
  }

  setCutoff(value) {
    this.k = 1 - Math.exp(-2 * Math.PI * value * this.period);
  }

  input(data) {
    const output = this.output;
    const k = this.k;
    output[0] += k * (data[0] - output[0]);
    output[1] += k * (data[1] - output[1]);
    output[2] += k * (data[2] - output[2]);

    return output;
  }
}

class SensorExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDialog: true });
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });

    this.motionInput = this.require('motion-input', {
      descriptors: ['acceleration', 'accelerationIncludingGravity', 'rotationRate'],
    });

    this.dice = null;
    this.edge = 0;
    this.gyroMag = 0;

    this.holdsStill = false;
    this.stillStartTime = Infinity;
    this.freeFallStartTime = Infinity;
    this.freeTurnStartTime = Infinity;
    this.hitTime = -Infinity;
    this.offStillDuration = 15;

    this.onAcceleration = this.onAcceleration.bind(this);
    this.onAccelerationIncludingGravity = this.onAccelerationIncludingGravity.bind(this);
    this.onRotationRate = this.onRotationRate.bind(this);

    this.onStillTime = this.onStillTime.bind(this);
    this.onMute = this.onMute.bind(this);
    this.onStopAll = this.onStopAll.bind(this);
    this.onReload = this.onReload.bind(this);
  }

  start() {
    super.start();

    const accGravPeriod = this.motionInput.getPeriod('accelerationIncludingGravity');
    this.accGravLowpass = new Lowpass(accGravPeriod, 2.5);

    this.view = new soundworks.View(template, model);

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      const clientIndex = soundworks.client.index;
      const loaderData = this.audioBufferManager.data;
      const buffers = loaderData.sounds[clientIndex];
      const duration = loaderData.duration;
      const quantization = loaderData.quantization;

      const highpass = audioContext.createBiquadFilter();
      highpass.connect(audioContext.destination);
      highpass.type = 'highpass';
      highpass.frequency.value = 400;
      highpass.Q.value = 0;

      this.dice = new Dice(this.sync, buffers, duration, quantization, highpass);
      this.dice.level = 24;

      this.receive('stop-all', this.onStopAll);

      this.motionInput.addListener('acceleration', this.onAcceleration);
      this.motionInput.addListener('accelerationIncludingGravity', this.onAccelerationIncludingGravity);
      this.motionInput.addListener('rotationRate', this.onRotationRate);

      this.sharedParams.addParamListener('still-time', this.onStillTime);
      this.sharedParams.addParamListener('sensor-delay', (value) => this.dice.delay = value);
      this.sharedParams.addParamListener('sensor-gain', (value) => this.dice.level = value);
      this.sharedParams.addParamListener('mute-sensors', this.onMute);
      this.sharedParams.addParamListener('stop-all', this.onStopAll);
      this.sharedParams.addParamListener('reload-sensors', this.onReload);
    });
  }

  onAcceleration(data) {
    const now = getCurrentTime();
    const x = data[0];
    const y = data[1];
    const z = data[2];
    const mag = Math.sqrt(x * x + y * y + z * z);
    const isStill = mag < stillAccLowThreshold;
    const stillDuration = now - this.stillStartTime;
    const holdsStill = stillDuration > this.offStillDuration;

    // this.send('print', 'acc mag', [mag, stillDuration]);

    if (!isStill)
      this.stillStartTime = now;

    if (holdsStill !== this.holdsStill) {
      this.send('still', holdsStill);
      this.holdsStill = holdsStill;
    }
  }

  onAccelerationIncludingGravity(data) {
    const now = getCurrentTime();
    const x = data[0];
    const y = data[1];
    const z = data[2];
    const mag = Math.sqrt(x * x + y * y + z * z);
    const isFreeFall = (mag <= freeFallAccThreshold);
    const freeFallDuration = now - this.freeFallStartTime;

    // this.send('print', (isFreeFall) ? '---> FREE FALL!' : '           accG', [mag.toFixed(2), freeFallDuration.toFixed(3)]);

    if (!isFreeFall) {
      const timeSinceLastHit = now - this.hitTime;
      if (freeFallDuration > freeFallDurationThreshold && timeSinceLastHit > interHitTimeHighThreshold) {

        if (!this.isMuted)
          this.dice.start();

        this.send('start');
        this.hitTime = now;
      }

      this.freeFallStartTime = now;
    }

    const filtered = this.accGravLowpass.input(data);
    const filteredX = filtered[0];
    const filteredY = filtered[1];
    const filteredZ = filtered[2];
    const absX = Math.abs(filteredX);
    const absY = Math.abs(filteredY);
    const absZ = Math.abs(filteredZ);
    let e = 0;

    if (absX > absY && absX > absZ) {
      if (filteredX > 0) {
        e = 5;
      } else {
        e = 2;
      }
    } else if (absY > absX && absY > absZ) {
      if (filteredY > 0) {
        e = 1;
      } else {
        e = 6;
      }
    } else if (absZ > absX && absZ > absY) {
      if (filteredZ > 0) {
        e = 3;
      } else {
        e = 4;
      }
    }

    if (e !== this.edge) {
      this.view.model.edge = e;
      this.view.render('#edge');

      this.send('edge', e);
      this.dice.edge = e;
      this.edge = e;
    }
  }

  onRotationRate(data) {
    const now = getCurrentTime();
    const alpha = data[0];
    const beta = data[1];
    const gamma = data[2];
    const mag = Math.sqrt(alpha * alpha + beta * beta + gamma * gamma);
    const diff = Math.abs(mag - this.gyroMag) / mag;
    const isFreeTurn = (mag > freeTurnGyroHighThreshold && diff < freeTurnGyroDiffLowThreshold);
    const freeTurnDuration = now - this.freeTurnStartTime;

    // this.send('print', (isFreeTurn)? '---> FREE TURN!': '           gyro', [mag.toFixed(2), diff.toFixed(4), freeTurnDuration.toFixed(3)]);

    if (!isFreeTurn) {
      const timeSinceLastHit = now - this.hitTime;

      if (freeTurnDuration > freeTurnDurationThreshold && timeSinceLastHit > interHitTimeHighThreshold) {
        if (!this.isMuted)
          this.dice.start();

        this.send('start');
        this.hitTime = now;
      }

      this.freeTurnStartTime = now;
    }

    this.gyroMag = mag;
  }

  onMute(mute) {
    if (mute !== this.isMuted) {
      if (mute)
        this.dice.stop();

      this.isMuted = mute;
    }
  }

  onStillTime(value) {
    this.offStillDuration = value;
  }

  onStopAll(releaseTime = 1) {
    this.dice.stop(releaseTime);
  }

  onReload() {
    window.location.reload(true);
  }
}

export default SensorExperience;