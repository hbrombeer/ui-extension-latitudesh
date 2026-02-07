import { importTypes } from '@rancher/auto-import';
import { IPlugin } from '@shell/core/types';

// Init the extension: auto-register cloud-credential and machine-config components
export default function(plugin: IPlugin) {
  importTypes(plugin);
  plugin.metadata = require('./package.json');
}
