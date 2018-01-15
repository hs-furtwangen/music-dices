import * as soundworks from 'soundworks/client';
import audioFiles from '../shared/audioFiles.js';
import Dice from '../shared/Dice.js';

const template = `
  <div class="title">display</div>
  <div id="edge" class="center"><%= edge %></p></div>
`;

const model = {
  edge: '',
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
    this.onStop = this.onStop.bind(this);
    this.onMute = this.onMute.bind(this);
  }

  start() {
    super.start(); // don't forget this

    // initialize the view
    this.view = new soundworks.View(template, model);

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      for (let i = 0; i < numDices; i++) {
        const buffers = this.audioBufferManager.data[i];
        const dice = new Dice(this.sync, buffers);
        this.dices.push(dice);
      }

      this.receive('edge', this.onEdge);
      this.receive('stop', this.onStop);

      this.sharedParams.addParamListener('mute-display', this.onMute);
    });
  }

  onEdge(index, e) {
    const dice = this.dices[index];

    if (!this.isMuted && dice)
      dice.startSound(e);

    this.view.model.edge = e;
    this.view.render('#edge');
  }

  onStop(index) {
    if (index !== undefined) {
      const dice = this.dices[index];

      if (dice)
        dice.stopSound();
    } else {
      for (let dice of this.dices)
        dice.stopSound();
    }
  }

  onMute(mute) {
    if (mute !== this.isMuted) {
      if (mute) {
        for (let dice of this.dices)
          dice.stopSound();
      }

      this.isMuted = mute;
    }
  }
}

export default DisplayExperience;