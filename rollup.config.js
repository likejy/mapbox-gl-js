import flow from 'rollup-plugin-flow';
import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import unassert from 'rollup-plugin-unassert';
import json from 'rollup-plugin-json';
import browserifyPlugin from 'rollup-plugin-browserify-transform';
import brfs from 'brfs';
import uglify from 'rollup-plugin-uglify'
import minifyStyleSpec from './build/rollup_plugin_minify_style_spec';

const production = process.env.BUILD === 'production';
const outputFile = production ? 'dist/mapbox-gl.js' : 'dist/mapbox-gl-dev.js';

const plugins = [
    flow(),
    minifyStyleSpec(),
    json(),
    buble({transforms: {dangerousForOf: true}, objectAssign: "Object.assign"}),
    unassert(),
    resolve({
        browser: true,
        preferBuiltins: false
    }),
    browserifyPlugin(brfs, {
        include: 'src/shaders/index.js'
    }),
    commonjs({
        namedExports: {
            '@mapbox/gl-matrix': ['vec3', 'vec4', 'mat2', 'mat3', 'mat4']
        }
    })
]

if (production) {
    plugins.push(uglify());
}

const config = [{
    input: ['src/index.js', 'src/source/worker.js'],
    output: {
        name: 'mapboxgl',
        dir: 'rollup/build',
        format: 'amd',
        sourcemap: 'inline'
    },
    experimentalCodeSplitting: true,
    plugins
}, {
    input: 'rollup/main.js',
    output: {
        name: 'mapboxgl',
        file: outputFile,
        format: 'umd',
        sourcemap: production ? true : 'inline'
    },
    plugins: production ? [] : [uglify()],
    intro: `
let shared, worker, mapboxgl;
function define(_, module) {
if (!shared) {
    shared = module;
} else if (!worker) {
    worker = module;
} else {
    const workerBundleString = 'const sharedModule = {}; (' + shared + ')(sharedModule); (' + worker + ')(sharedModule);'

    const sharedModule = {};
    shared(sharedModule);
    mapboxgl = module(sharedModule);
    mapboxgl.workerUrl = window.URL.createObjectURL(new Blob([workerBundleString], { type: 'text/javascript' }));
}
}
`
}];

export default config
