// @flow

import Point from '@mapbox/point-geometry';

import window from './window';

export const create = function (tagName: *, className?: string, container?: HTMLElement) {
    const el = window.document.createElement(tagName);
    if (className) el.className = className;
    if (container) container.appendChild(el);
    return el;
};

export const createNS = function (namespaceURI: string, tagName: string) {
    const el = window.document.createElementNS(namespaceURI, tagName);
    return el;
};

const docStyle = (window.document.documentElement: any).style;

function testProp(props) {
    for (let i = 0; i < props.length; i++) {
        if (props[i] in docStyle) {
            return props[i];
        }
    }
    return props[0];
}

const selectProp = testProp(['userSelect', 'MozUserSelect', 'WebkitUserSelect', 'msUserSelect']);
let userSelect;

export const disableDrag = function () {
    if (selectProp) {
        userSelect = docStyle[selectProp];
        docStyle[selectProp] = 'none';
    }
};

export const enableDrag = function () {
    if (selectProp) {
        docStyle[selectProp] = userSelect;
    }
};

const transformProp = testProp(['transform', 'WebkitTransform']);

export const setTransform = function(el: HTMLElement, value: string) {
    (el.style: any)[transformProp] = value;
};

// Suppress the next click, but only if it's immediate.
const suppressClick: MouseEventListener = function (e) {
    e.preventDefault();
    e.stopPropagation();
    window.removeEventListener('click', suppressClick, true);
};

export const suppressClick = function() {
    window.addEventListener('click', suppressClick, true);
    window.setTimeout(() => {
        window.removeEventListener('click', suppressClick, true);
    }, 0);
};

export const mousePos = function (el: HTMLElement, e: any) {
    const rect = el.getBoundingClientRect();
    e = e.touches ? e.touches[0] : e;
    return new Point(
        e.clientX - rect.left - el.clientLeft,
        e.clientY - rect.top - el.clientTop
    );
};

export const touchPos = function (el: HTMLElement, e: any) {
    const rect = el.getBoundingClientRect(),
        points = [];
    const touches = (e.type === 'touchend') ? e.changedTouches : e.touches;
    for (let i = 0; i < touches.length; i++) {
        points.push(new Point(
            touches[i].clientX - rect.left - el.clientLeft,
            touches[i].clientY - rect.top - el.clientTop
        ));
    }
    return points;
};

export const remove = function(node: HTMLElement) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
};
