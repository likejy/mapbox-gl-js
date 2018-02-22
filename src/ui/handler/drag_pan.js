// @flow

const DOM = require('../../util/dom');
const util = require('../../util/util');
const window = require('../../util/window');
const browser = require('../../util/browser');
const {Event} = require('../../util/evented');

import type Map from '../map';
import type Point from '@mapbox/point-geometry';
import type Transform from '../../geo/transform';

const inertiaLinearity = 0.3,
    inertiaEasing = util.bezier(0, 0, inertiaLinearity, 1),
    inertiaMaxSpeed = 1400, // px/s
    inertiaDeceleration = 2500; // px/s^2

/**
 * The `DragPanHandler` allows the user to pan the map by clicking and dragging
 * the cursor.
 */
class DragPanHandler {
    _map: Map;
    _el: HTMLElement;
    _state: 'disabled' | 'inactive' | 'pending' | 'active';
    _pos: Point;
    _previousPos: Point;
    _inertia: Array<[number, Point]>;
    _lastMoveEvent: MouseEvent | TouchEvent | void;

    /**
     * @private
     */
    constructor(map: Map) {
        this._map = map;
        this._el = map.getCanvasContainer();
        this._state = 'disabled';

        util.bindAll([
            'onDown',
            'onMove',
            'onUp',
            '_onDragFrame'
        ], this);
    }

    /**
     * Returns a Boolean indicating whether the "drag to pan" interaction is enabled.
     *
     * @returns {boolean} `true` if the "drag to pan" interaction is enabled.
     */
    isEnabled() {
        return this._state !== 'disabled';
    }

    /**
     * Returns a Boolean indicating whether the "drag to pan" interaction is active, i.e. currently being used.
     *
     * @returns {boolean} `true` if the "drag to pan" interaction is active.
     */
    isActive() {
        return this._state === 'active';
    }

    /**
     * Enables the "drag to pan" interaction.
     *
     * @example
     * map.dragPan.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._el.classList.add('mapboxgl-touch-drag-pan');
        this._state = 'inactive';
    }

    /**
     * Disables the "drag to pan" interaction.
     *
     * @example
     * map.dragPan.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._el.classList.remove('mapboxgl-touch-drag-pan');
        this._state = 'disabled';
    }

    onDown(e: MouseEvent | TouchEvent) {
        if (this._state !== 'inactive') return;

        if (e.touches) {
            if ((e.touches: any).length > 1) return;
        } else {
            if (e.ctrlKey || e.button !== 0) return;
        }

        // Deactivate DragPan when the window loses focus. Otherwise if a mouseup occurs when the window
        // isn't in focus, DragPan will still be active even though the mouse is no longer pressed.
        window.addEventListener('blur', this.onUp);

        this._state = 'pending';
        this._previousPos = DOM.mousePos(this._el, e);
        this._inertia = [[browser.now(), this._previousPos]];
    }

    onMove(e: MouseEvent | TouchEvent) {
        if (this._state !== 'pending' && this._state !== 'active') return;

        this._lastMoveEvent = e;
        e.preventDefault();

        this._pos = DOM.mousePos(this._el, e);
        this._drainInertiaBuffer();
        this._inertia.push([browser.now(), this._pos]);

        if (this._state === 'pending') {
            // we treat the first move event (rather than the mousedown event)
            // as the start of the drag
            this._state = 'active';
            this._fireEvent('dragstart', e);
            this._fireEvent('movestart', e);
        }

        this._map._startAnimation(this._onDragFrame);
    }

    /**
     * Called in each render frame while dragging is happening.
     * @private
     */
    _onDragFrame(tr: Transform) {
        const e = this._lastMoveEvent;
        if (!e) return;

        tr.setLocationAtPoint(tr.pointLocation(this._previousPos), this._pos);
        this._fireEvent('drag', e);
        this._fireEvent('move', e);

        this._previousPos = this._pos;
        delete this._lastMoveEvent;
    }

    /**
     * Called when dragging stops.
     * @private
     */
    onUp(e: MouseEvent | TouchEvent | FocusEvent) {
        if (this._state !== 'pending' && this._state !== 'active') return;
        if (e.type === 'mouseup' && e.button !== 0) return;

        window.removeEventListener('blur', this.onUp);

        if (this._state !== 'active') {
            this._state = 'inactive';
            return;
        }

        this._state = 'inactive';
        delete this._lastMoveEvent;
        delete this._previousPos;
        delete this._pos;

        this._fireEvent('dragend', e);
        this._drainInertiaBuffer();

        const finish = () => {
            this._fireEvent('moveend', e);
        };

        const inertia = this._inertia;
        if (inertia.length < 2) {
            finish();
            return;
        }

        const last = inertia[inertia.length - 1],
            first = inertia[0],
            flingOffset = last[1].sub(first[1]),
            flingDuration = (last[0] - first[0]) / 1000;

        if (flingDuration === 0 || last[1].equals(first[1])) {
            finish();
            return;
        }

        // calculate px/s velocity & adjust for increased initial animation speed when easing out
        const velocity = flingOffset.mult(inertiaLinearity / flingDuration);
        let speed = velocity.mag(); // px/s

        if (speed > inertiaMaxSpeed) {
            speed = inertiaMaxSpeed;
            velocity._unit()._mult(speed);
        }

        const duration = speed / (inertiaDeceleration * inertiaLinearity),
            offset = velocity.mult(-duration / 2);

        this._map.panBy(offset, {
            duration: duration * 1000,
            easing: inertiaEasing,
            noMoveStart: true
        }, { originalEvent: e });
    }

    _fireEvent(type: string, e: *) {
        return this._map.fire(new Event(type, e ? { originalEvent: e } : {}));
    }

    _drainInertiaBuffer() {
        const inertia = this._inertia,
            now = browser.now(),
            cutoff = 160;   // msec

        while (inertia.length > 0 && now - inertia[0][0] > cutoff) inertia.shift();
    }
}

module.exports = DragPanHandler;
