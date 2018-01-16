import * as soundworks from 'soundworks/server';

export default class SensorExperience extends soundworks.Experience {
  constructor() {
    super('sensor');

    this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.sharedConfig = this.require('shared-config');
    this.sharedConfig.share('audioFiles', 'sensor');
    this.sharedParams = this.require('shared-params');
  }

  enter(client) {
    super.enter(client);

    this.receive(client, 'edge', this.getClientOnEdge(client));
    this.receive(client, 'gyro-stats', this.getClientOnGyroStats(client));
  }

  exit(client) {
    super.exit(client);
    
    this.broadcast('display', null, 'stop', client.index);
  }

  getClientOnEdge(client) {
    return (e) => {
      this.broadcast('display', null, 'edge', client.index, e);
    };
  }

  getClientOnGyroStats(client) {
    return (mean, stddev) => {
      console.log("gyro stats:", mean, stddev);
    };
  }
}
