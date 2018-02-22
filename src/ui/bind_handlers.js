// @flow

const DOM = require('../util/dom');
const {MapMouseEvent, MapTouchEvent} = require('../ui/events');

import type Map from './map';

const handlers = {
    scrollZoom: require('./handler/scroll_zoom'),
    boxZoom: require('./handler/box_zoom'),
    dragRotate: require('./handler/drag_rotate'),
    dragPan: require('./handler/drag_pan'),
    keyboard: require('./handler/keyboard'),
    doubleClickZoom: require('./handler/dblclick_zoom'),
    touchZoomRotate: require('./handler/touch_zoom_rotate')
};

module.exports = function bindHandlers(map: Map, options: {}) {
    const el = map.getCanvasContainer();
    let contextMenuEvent = null;
    let mouseDown = false;
    let startPos = null;
    let tapped = null;

    for (const name in handlers) {
        (map: any)[name] = new handlers[name](map, options);
        if (options.interactive && options[name]) {
            (map: any)[name].enable(options[name]);
        }
    }

    el.addEventListener('mouseout', onMouseOut, false);
    el.addEventListener('mousedown', onMouseDown, false);
    el.addEventListener('mouseup', onMouseUp, false);
    el.addEventListener('mousemove', onMouseMove, false);
    el.addEventListener('mouseover', onMouseOver, false);
    el.addEventListener('touchstart', onTouchStart, false);
    el.addEventListener('touchend', onTouchEnd, false);
    el.addEventListener('touchmove', onTouchMove, false);
    el.addEventListener('touchcancel', onTouchCancel, false);
    el.addEventListener('click', onClick, false);
    el.addEventListener('dblclick', onDblClick, false);
    el.addEventListener('contextmenu', onContextMenu, false);

    function onMouseDown(e: MouseEvent) {
        const mapEvent = new MapMouseEvent('mousedown', map, e);
        map.fire(mapEvent);

        if (mapEvent.defaultPrevented) {
            return;
        }

        if (!map.doubleClickZoom.isActive()) {
            map.stop();
        }

        startPos = mapEvent.point;
        mouseDown = true;

        map.boxZoom.onMouseDown(e);

        if (!map.boxZoom.isActive() && !map.dragPan.isActive()) {
            map.dragRotate.onDown(e);
        }

        if (!map.boxZoom.isActive() && !map.dragRotate.isActive()) {
            map.dragPan.onDown(e);
        }
    }

    function onMouseMove(e: MouseEvent) {
        let target: any = e.toElement || e.target;
        while (target && target !== el) target = target.parentNode;
        if (target !== el) return;

        const mapEvent = new MapMouseEvent('mousemove', map, e);
        map.fire(mapEvent);

        map.boxZoom.onMouseMove(e);
        map.dragRotate.onMove(e);
        map.dragPan.onMove(e);
    }

    function onMouseUp(e: MouseEvent) {
        const rotating = map.dragRotate.isActive();

        if (contextMenuEvent && !rotating) {
            // This will be the case for Mac
            fireMouseEvent('contextmenu', contextMenuEvent);
        }

        contextMenuEvent = null;
        mouseDown = false;

        const mapEvent = new MapMouseEvent('mouseup', map, e);
        map.fire(mapEvent);

        map.boxZoom.onMouseUp(e);
        map.dragRotate.onUp(e);
        map.dragPan.onUp(e);
    }

    function onMouseOver(e: MouseEvent) {
        let target: any = e.toElement || e.target;
        while (target && target !== el) target = target.parentNode;
        if (target !== el) return;

        fireMouseEvent('mouseover', e);
    }

    function onMouseOut(e: MouseEvent) {
        fireMouseEvent('mouseout', e);
    }

    function onTouchStart(e: TouchEvent) {
        const mapEvent = new MapTouchEvent('touchstart', map, e);
        map.fire(mapEvent);

        if (mapEvent.defaultPrevented) {
            return;
        }

        map.stop();

        if (!e.touches || e.touches.length > 1) return;

        if (!tapped) {
            tapped = setTimeout(onTouchTimeout, 300);

        } else {
            clearTimeout(tapped);
            tapped = null;
            fireMouseEvent('dblclick', (e: any));
        }

        if (!map.boxZoom.isActive() && !map.dragRotate.isActive()) {
            map.dragPan.onDown(e);
        }

        map.touchZoomRotate.onStart(e);
    }

    function onTouchMove(e: TouchEvent) {
        const mapEvent = new MapTouchEvent('touchmove', map, e);
        map.fire(mapEvent);

        map.dragPan.onMove(e);
        map.touchZoomRotate.onMove(e);
    }

    function onTouchEnd(e: TouchEvent) {
        const mapEvent = new MapTouchEvent('touchend', map, e);
        map.fire(mapEvent);

        map.dragPan.onUp(e);
        map.touchZoomRotate.onEnd(e);
    }

    function onTouchCancel(e: TouchEvent) {
        fireTouchEvent('touchcancel', e);
    }

    function onTouchTimeout() {
        tapped = null;
    }

    function onClick(e: MouseEvent) {
        const pos = DOM.mousePos(el, e);

        if (pos.equals((startPos: any))) {
            fireMouseEvent('click', e);
        }
    }

    function onDblClick(e: MouseEvent) {
        fireMouseEvent('dblclick', e);
        e.preventDefault();
    }

    function onContextMenu(e: MouseEvent) {
        const rotating = map.dragRotate.isActive();
        if (!mouseDown && !rotating) {
            // Windows: contextmenu fired on mouseup, so fire event now
            fireMouseEvent('contextmenu', e);
        } else if (mouseDown) {
            // Mac: contextmenu fired on mousedown; we save it until mouseup for consistency's sake
            contextMenuEvent = e;
        }

        e.preventDefault();
    }

    function fireMouseEvent(type: string, originalEvent: MouseEvent) {
        map.fire(new MapMouseEvent(type, map, originalEvent));
    }

    function fireTouchEvent(type: string, originalEvent: TouchEvent) {
        map.fire(new MapTouchEvent(type, map, originalEvent));
    }
};
