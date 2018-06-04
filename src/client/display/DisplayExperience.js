import * as soundworks from 'soundworks/client';
import audioFiles from '../shared/audioFiles.js';
import Dice from '../shared/Dice.js';

const template = `
  <div class="title">display</div>
  <div id="edge" class="center"><%= edge[0] %> <%= edge[1] %> <%= edge[2] %></p></div>
`;

const model = {
  edge: ['-', '-', '-'],
};

const numDices = 3;

class DisplayExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDialog: false });
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.sync = this.require('sync');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });

    this.dices = [];
    this.isMuted = false;

    this.onEdge = this.onEdge.bind(this);
    this.onStart = this.onStart.bind(this);
    this.onExit = this.onExit.bind(this);
    this.onMute = this.onMute.bind(this);
    this.onStopAll = this.onStopAll.bind(this);
  }

  start() {
    super.start(); // don't forget this

    // initialize the view
    this.view = new soundworks.View(template, model);

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      const loaderData = this.audioBufferManager.data;
      const duration = loaderData.duration;
      const quantization = loaderData.quantization;

      for (let i = 0; i < numDices; i++) {
        const buffers = loaderData.sounds[i];
        const dice = new Dice(this.sync, buffers, duration, quantization);
        this.dices.push(dice);
      }

      this.receive('edge', this.onEdge);
      this.receive('start', this.onStart);
      this.receive('exit', this.onExit);
      this.receive('stop-all', this.onStopAll);

      this.sharedParams.addParamListener(`display-1-gain`, (value) => this.dices[0].level = value);
      this.sharedParams.addParamListener(`display-2-gain`, (value) => this.dices[1].level = value);
      this.sharedParams.addParamListener(`display-3-gain`, (value) => this.dices[2].level = value);
      this.sharedParams.addParamListener('mute-display', this.onMute);
      this.sharedParams.addParamListener('stop-all', this.onStopAll);
    });
  }

  onEdge(index, e) {
    const dice = this.dices[index];

    if (dice)
      dice.edge = e;

    this.view.model.edge[index] = e;
    this.view.render('#edge');
  }

  onStart(index) {
    const dice = this.dices[index];

    if (dice && !this.isMuted)
      dice.start();
  }

  onExit(index) {
    const dice = this.dices[index];

    if (dice)
      dice.stop();

    this.view.model.edge[index] = '-';
    this.view.render('#edge');
  }

  onMute(mute) {
    if (mute !== this.isMuted) {
      if (mute) {
        for (let dice of this.dices)
          dice.stop();
      }

      this.isMuted = mute;
    }
  }

  onStopAll(releaseTime = 1) {
    for (let dice of this.dices)
      dice.stop(releaseTime);
  }
}

export default DisplayExperience;