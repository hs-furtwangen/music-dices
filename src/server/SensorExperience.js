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

    this.stillClients = [true, true, true];
    this.fadeoutTime = 7.5;

    this.onFadeoutTime = this.onFadeoutTime.bind(this);
    this.onStopAll = this.onStopAll.bind(this);
    this.sharedParams.addParamListener('fadeout-time', this.onFadeoutTime);
    this.sharedParams.addParamListener('stop-all', this.onStopAll);
  }

  enter(client) {
    super.enter(client);

    this.receive(client, 'edge', this.getClientOnEdge(client));
    this.receive(client, 'start', this.getClientOnStart(client));
    this.receive(client, 'still', this.getClientOnStill(client));
    this.receive(client, 'print', this.getClientOnPrint(client));
  }

  exit(client) {
    super.exit(client);
    this.broadcast('display', null, 'exit', client.index);
    this.setClientStill(client.index, true);
  }

  setClientStill(index, still) {
    let numStillClients = 0;

    this.stillClients[index] = still;

    for (let clientStill of this.stillClients)
      numStillClients += clientStill;

    const allClientsStill = (numStillClients >= this.clients.length);

    // console.log('still:', this.stillClients, allClientsStill, still);

    if (allClientsStill) {
      // console.log('---> all still:', this.stillClients);

      this.broadcast(['sensor', 'display'], null, 'stop-all', this.fadeoutTime);
    }
  }

  setClientStart(index) {
    let numStillClients = 0;

    for (let still of this.stillClients)
      numStillClients += still;

    const allClientsStill = (numStillClients >= this.clients.length);

    // console.log('still:', this.stillClients, allClientsStill, still);

    if (allClientsStill) {
      for (let i = 0; i < this.stillClients.length; i++)
        this.stillClients[i] = false;

      // console.log('---> nothing still:', this.stillClients);
    } else {
      this.stillClients[index] = false;

      // console.log('---> still:', this.stillClients);
    }
  }

  onFadeoutTime(value) {
    this.fadeoutTime = value;
  }

  onStopAll() {
    this.stillClients = [true, true, true];
  }

  getClientOnEdge(client) {
    return (e) => {
      this.broadcast('display', null, 'edge', client.index, e);
    };
  }

  getClientOnStart(client) {
    return () => {
      this.broadcast('display', null, 'start', client.index);
      this.setClientStart(client.index);
    };
  }

  getClientOnStill(client) {
    return (isStill) => {
      this.setClientStill(client.index, true);
    };
  }

  getClientOnPrint(client) {
    return (tag, value) => {
      if (!this.mutePrinting)
        console.log(tag, value);
    };
  }
}
