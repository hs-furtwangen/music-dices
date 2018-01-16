import * as soundworks from 'soundworks/client';
import * as lfo from 'waves-lfo/client';
import audioFiles from '../shared/audioFiles.js';
import Dice from '../shared/Dice.js';

const audioContext = soundworks.audioContext;

const template = `
  <div class="title">sensor</div>
  <div id="edge" class="center"><%= edge %></p></div>
`;

const model = {
  edge: '',
};

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

    this.platform = this.require('platform');
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: [] //audioFiles,
    });

    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity', 'rotationRate'],
    });

    this.dice = null;
    this.edge = 0;
    this.gyroMag = 0;

    this.onAcceleration = this.onAcceleration.bind(this);
    this.onAccelerationIncludingGravity = this.onAccelerationIncludingGravity.bind(this);
    this.onRotationRate = this.onRotationRate.bind(this);
    this.onStop = this.onStop.bind(this);
    this.onMute = this.onMute.bind(this);
  }

  start() {
    super.start();

    const accGravPeriod = this.motionInput.getPeriod('accelerationIncludingGravity');
    this.accGravLowpass = new Lowpass(accGravPeriod, 2.5);

    this.view = new soundworks.View(template, model);

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      const clientIndex = soundworks.client.index;
      const buffers = this.audioBufferManager.data[clientIndex];

      this.dice = new Dice(this.sync, buffers);

      this.motionInput.addListener('acceleration', this.onAcceleration);
      this.motionInput.addListener('accelerationIncludingGravity', this.onAccelerationIncludingGravity);
      this.motionInput.addListener('rotationRate', this.onRotationRate);

      const gyroPeriod = this.motionInput.getPeriod('rotationRate');
      const eventIn = new lfo.source.EventIn({
        frameType: 'scalar',
        frameSize: 1,
        frameRate: 1 / gyroPeriod,
      });

      const slicer = new lfo.operator.Slicer({
        frameSize: 24,
        hopSize: 4
      });

      const stats = new lfo.operator.MeanStddev();
      const bridge = new lfo.sink.Bridge({
        processFrame: (frame) => this.send('gyro-stats', frame.data[0], frame.data[1])
      });

      stats.connect(bridge);
      slicer.connect(stats);
      eventIn.connect(slicer);
      eventIn.start();
      this.eventIn = eventIn;

      this.sharedParams.addParamListener('mute-sensors', this.onMute);
      this.sharedParams.addParamListener('reload-sensors', this.onReload);
    });
  }

  onRotationRate(data) {
    const alpha = data[0];
    const beta = data[1];
    const gamma = data[2];
    const mag = Math.sqrt(alpha * alpha + beta * beta + gamma * gamma);
    const diff = mag - this.gyroMag;

    this.gyroMag = mag;

    const frame = {
      time: audioContext.currentTime,
      data: diff,
    };

    this.eventIn.processFrame(frame);
  }

  onAcceleration(data) {
    const x = data[0];
    const y = data[1];
    const z = data[2];
    const mag = Math.sqrt(x * x + y * y + z * z);
  }

  onAccelerationIncludingGravity(data) {
    const filtered = this.accGravLowpass.input(data);
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

      // if (!this.isMuted)
      //   this.dice.startSound(e);

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

  onReload() {
    window.location.reload(true);
  }
}

export default SensorExperience;