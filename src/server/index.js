import 'source-map-support/register'; // enable sourcemaps in node
import path from 'path';
import * as soundworks from 'soundworks/server';
import SensorExperience from './SensorExperience';
import DisplayExperience from './DisplayExperience';

const configName = process.env.ENV || 'default';
const configPath = path.join(__dirname, 'config', configName);
let config = null;

try {
  config = require(configPath).default;
} catch (err) {
  console.error(`Invalid ENV "${configName}", file "${configPath}.js" not found`);
  process.exit(1);
}

process.env.NODE_ENV = config.env;

soundworks.server.init(config);

soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    websockets: config.websockets,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});

const sharedParams = soundworks.serviceManager.require('shared-params');
sharedParams.addNumber('still-time', 'still time', 1, 20, 0.5, 15, ['controller', 'sensor']);
sharedParams.addNumber('fadeout-time', 'fadeout time', 1, 20, 0.5, 7.5, ['controller']);
sharedParams.addNumber('sensor-delay', 'sensor delay', 0, 0.25, 0.001, 0, ['controller', 'sensor']);
sharedParams.addNumber('display-1-gain', 'drum gain', -24, 24, 1, 0, ['controller', 'display']);
sharedParams.addNumber('display-2-gain', 'lead gain', -24, 24, 1, 0, ['controller', 'display']);
sharedParams.addNumber('display-3-gain', 'rhythm gain', -24, 24, 1, 0, ['controller', 'display']);
sharedParams.addNumber('sensor-gain', 'sensor gain', -48, 48, 1, 0, ['controller', 'sensor']);
sharedParams.addBoolean('mute-sensors', 'mute sensors', false, ['controller', 'sensor']);
sharedParams.addBoolean('mute-display', 'mute display', false, ['controller', 'display']);
sharedParams.addTrigger('stop-all', 'stop all', ['sensor, display']);
sharedParams.addTrigger('reload-sensors', 'reload sensors', ['sensor']);

const sensorExperience = new SensorExperience();
const displayExperience = new DisplayExperience();
const controllerExperience = new soundworks.ControllerExperience('controller');

sharedParams.addParamListener('mute-sensors', (value) => sensorExperience.mutePrinting = value);

soundworks.server.start();