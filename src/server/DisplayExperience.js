import * as soundworks from 'soundworks/server';

export default class DisplayExperience extends soundworks.Experience {
  constructor() {
    super('display');

    this.sync = this.require('sync');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.sharedConfig = this.require('shared-config');
    this.sharedConfig.share('audioFiles', 'display');
    this.sharedParams = this.require('shared-params');
  }

  enter(client) {

  }

  exit(client) {
    
  }
}
