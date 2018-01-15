import * as soundworks from 'soundworks/client';
import audioFiles from '../shared/audioFiles.js';
import Dice from '../shared/Dice.js';

const template = `
  <div class="title">sensor</div>
  <div id="edge" class="center"><%= edge %></p></div>
`;

const model = {
  edge: '',
};

class Lowpass {
  constructor(period, cutoff = 10) {
    this.a1 = 0;
    this.b0 = 0;
    this.output = [0, 0, 0];

    this.period = period; // period in sec
    this.setCutoff(cutoff); // cutoff frequency in Hz
  }

  setCutoff(value) {
    this.a1 = Math.exp(-2 * Math.PI * value * this.period);
    this.b0 = 1 - this.a1;
  }

  input(data) {
    const output = this.output;
    const b0 = this.b0;
    output[0] += b0 * (data[0] - output[0]);
    output[1] += b0 * (data[1] - output[1]);
    output[2] += b0 * (data[2] - output[2]);

    return output;
  }
}

class SensorExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform');
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });

    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity'],
    });

    this.dice = null;
    this.edge = 0;

    this.onAcceleration = this.onAcceleration.bind(this);
    this.onStop = this.onStop.bind(this);
    this.onMute = this.onMute.bind(this);
  }

  start() {
    super.start();

    const period = this.motionInput.getPeriod('accelerationIncludingGravity');
    this.lowpass = new Lowpass(period, 2.5);

    // initialize the view
    this.view = new soundworks.View(template, model);

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      const clientIndex = soundworks.client.index;
      const buffers = this.audioBufferManager.data[clientIndex];

      this.dice = new Dice(this.sync, buffers);

      this.motionInput.addListener('accelerationIncludingGravity', this.onAcceleration);

      this.sharedParams.addParamListener('mute-sensors', this.onMute);
    });
  }

  onAcceleration(data) {
    const filtered = this.lowpass.input(data);
    const x = filtered[0];
    const y = filtered[1];
    const z = filtered[2];
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);
    let e = 0;

    if (absX > absY && absX > absZ) {
      if (x > 0) {
        e = 5;
      } else {
        e = 2;
      }
    } else if (absY > absX && absY > absZ) {
      if (y > 0) {
        e = 1;
      } else {
        e = 6;
      }
    } else if (absZ > absX && absZ > absY) {
      if (z > 0) {
        e = 3;
      } else {
        e = 4;
      }
    }

    if (e !== this.edge) {
      this.view.model.edge = e;
      this.view.render('#edge');

      this.send('edge', e);

      if (!this.isMuted)
        this.dice.startSound(e);

      this.edge = e;
    }
  }

  onStop(index) {
    this.dice.stopSound();
  }

  onMute(mute) {
    if (mute !== this.isMuted) {
      if (mute)
        this.dice.stopSound();

      this.isMuted = mute;
    }
  }
}

export default SensorExperience;