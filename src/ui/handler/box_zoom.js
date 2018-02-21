// @flow

const DOM = require('../../util/dom');
const LngLatBounds = require('../../geo/lng_lat_bounds');
const util = require('../../util/util');
const window = require('../../util/window');
const {Event} = require('../../util/evented');

import type Map from '../map';

/**
 * The `BoxZoomHandler` allows the user to zoom the map to fit within a bounding box.
 * The bounding box is defined by clicking and holding `shift` while dragging the cursor.
 */
class BoxZoomHandler {
    _map: Map;
    _el: HTMLElement;
    _container: HTMLElement;
    _state: 'disabled' | 'inactive' | 'pending' | 'active';
    _startPos: any;
    _box: HTMLElement;

    /**
     * @private
     */
    constructor(map: Map) {
        this._map = map;
        this._el = map.getCanvasContainer();
        this._container = map.getContainer();
        this._state = 'disabled';

        util.bindAll([
            'onMouseDown',
            'onMouseMove',
            'onMouseUp',
            '_onKeyDown'
        ], this);
    }

    /**
     * Returns a Boolean indicating whether the "box zoom" interaction is enabled.
     *
     * @returns {boolean} `true` if the "box zoom" interaction is enabled.
     */
    isEnabled() {
        return this._state !== 'disabled';
    }

    /**
     * Returns a Boolean indicating whether the "box zoom" interaction is active, i.e. currently being used.
     *
     * @returns {boolean} `true` if the "box zoom" interaction is active.
     */
    isActive() {
        return this._state === 'active';
    }

    /**
     * Enables the "box zoom" interaction.
     *
     * @example
     *   map.boxZoom.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._state = 'inactive';
    }

    /**
     * Disables the "box zoom" interaction.
     *
     * @example
     *   map.boxZoom.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._state = 'disabled';
    }

    onMouseDown(e: MouseEvent) {
        if (this._state !== 'inactive') return;
        if (!(e.shiftKey && e.button === 0)) return;

        window.document.addEventListener('keydown', this._onKeyDown, false);

        DOM.disableDrag();

        this._state = 'pending';
        this._startPos = DOM.mousePos(this._el, e);
    }

    onMouseMove(e: MouseEvent) {
        if (this._state !== 'pending' && this._state !== 'active') return;

        const p0 = this._startPos,
            p1 = DOM.mousePos(this._el, e);

        if (this._state === 'pending') {
            this._state = 'active';
            this._box = DOM.create('div', 'mapboxgl-boxzoom', this._container);
            this._container.classList.add('mapboxgl-crosshair');
            this._fireEvent('boxzoomstart', e);
        }

        const minX = Math.min(p0.x, p1.x),
            maxX = Math.max(p0.x, p1.x),
            minY = Math.min(p0.y, p1.y),
            maxY = Math.max(p0.y, p1.y);

        DOM.setTransform(this._box, `translate(${minX}px,${minY}px)`);

        this._box.style.width = `${maxX - minX}px`;
        this._box.style.height = `${maxY - minY}px`;
    }

    onMouseUp(e: MouseEvent) {
        if (this._state !== 'pending' && this._state !== 'active') return;
        if (e.button !== 0) return;

        this._finish();

        if (this._state !== 'active') {
            this._state = 'inactive';
            return;
        }

        this._state = 'inactive';

        const p0 = this._startPos,
            p1 = DOM.mousePos(this._el, e),
            bounds = new LngLatBounds()
                .extend(this._map.unproject(p0))
                .extend(this._map.unproject(p1));

        if (p0.x === p1.x && p0.y === p1.y) {
            this._fireEvent('boxzoomcancel', e);
        } else {
            this._map
                .fitBounds(bounds, {linear: true})
                .fire(new Event('boxzoomend', { originalEvent: e, boxZoomBounds: bounds }));
        }
    }

    _onKeyDown(e: KeyboardEvent) {
        if (e.keyCode === 27) {
            this._finish();

            if (this._state !== 'active') {
                this._state = 'inactive';
                return;
            }

            this._state = 'inactive';
            this._fireEvent('boxzoomcancel', e);
        }
    }

    _finish() {
        window.document.removeEventListener('keydown', this._onKeyDown, false);

        this._container.classList.remove('mapboxgl-crosshair');

        if (this._box) {
            DOM.remove(this._box);
            this._box = (null: any);
        }

        DOM.enableDrag();
    }

    _fireEvent(type: string, e: *) {
        return this._map.fire(new Event(type, { originalEvent: e }));
    }
}

module.exports = BoxZoomHandler;
