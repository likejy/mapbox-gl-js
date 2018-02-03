// @flow

import ajax from '../util/ajax';

import Evented from '../util/evented';
import window from '../util/window';

let pluginRequested = false;
let pluginBlobURL = null;

export const evented = new Evented();

type ErrorCallback = (error: Error) => void;

export const registerForPluginAvailability = function(
    callback: (args: {pluginBlobURL: string, errorCallback: ErrorCallback}) => void
) {
    if (pluginBlobURL) {
        callback({ pluginBlobURL: pluginBlobURL, errorCallback: module.exports.errorCallback});
    } else {
        module.exports.evented.once('pluginAvailable', callback);
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
    export const errorCallback = callback;
    ajax.getArrayBuffer({ url: pluginURL }, (err, response) => {
        if (err) {
            callback(err);
        } else if (response) {
            pluginBlobURL = createBlobURL(response);
            module.exports.evented.fire('pluginAvailable', { pluginBlobURL: pluginBlobURL, errorCallback: callback });
        }
    });
};

export const applyArabicShaping = null: ?Function;
export const processBidirectionalText = null: ?(string, Array<number>) => Array<string>;
