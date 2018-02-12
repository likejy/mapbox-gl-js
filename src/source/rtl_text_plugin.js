// @flow

import {getArrayBuffer} from '../util/ajax';

import Evented from '../util/evented';
import window from '../util/window';

let pluginRequested = false;
let pluginBlobURL = null;

export const evented = new Evented();

type ErrorCallback = (error: Error) => void;

let _errorCallback;

export const registerForPluginAvailability = function(
    callback: (args: {pluginBlobURL: string, errorCallback: ErrorCallback}) => void
) {
    if (pluginBlobURL) {
        callback({ pluginBlobURL: pluginBlobURL, errorCallback: _errorCallback});
    } else {
        evented.once('pluginAvailable', callback);
    }
    return callback;
};

// Exposed so it can be stubbed out by tests
export const createBlobURL = function(response: Object) {
    return window.URL.createObjectURL(new window.Blob([response.data], {type: "text/javascript"}));
};

// Only exposed for tests
export const clearRTLTextPlugin = function() {
    pluginRequested = false;
    pluginBlobURL = null;
};

export const setRTLTextPlugin = function(pluginURL: string, callback: ErrorCallback) {
    if (pluginRequested) {
        throw new Error('setRTLTextPlugin cannot be called multiple times.');
    }
    pluginRequested = true;
    _errorCallback = callback;
    getArrayBuffer({ url: pluginURL }, (err, response) => {
        if (err) {
            callback(err);
        } else if (response) {
            pluginBlobURL = createBlobURL(response);
            evented.fire('pluginAvailable', { pluginBlobURL: pluginBlobURL, errorCallback: callback });
        }
    });
};

export const plugin: {
    applyArabicShaping: ?Function,
    processBidirectionalText: ?(string, Array<number>) => Array<string>
} = {
    applyArabicShaping: null,
    processBidirectionalText: null
};
