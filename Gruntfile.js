'use strict';

var through = require('through');

// The elliptic package.json is only used for its version
var ellipticPackage = require('elliptic/package.json');
ellipticPackage = JSON.stringify({ version: ellipticPackage.version });


// Make sure the versions we are building a dist from are the most rescent
[ 'contracts', 'providers', 'utils', 'wallet'].forEach(function(name) {
    var npmVersion = require('./node_modules/ethers-' + name + '/package.json').version;
    var liveVersion = require('./' + name + '/package.json').version;
    if (npmVersion !== liveVersion) {
        console.log(name, ('npm=' + npmVersion), ('live=' + liveVersion));
        throw new Error('version mismatch for ' + name + ' - redo npm install');
    }

    console.log('Including: ', name + '@' + npmVersion);
});




var undef = "module.exports = undefined;";
var empty = "module.exports = {};";


// We already have a random Uint8Array browser/node safe source
var brorand = "var randomBytes = require('ethers-utils').randomBytes; module.exports = function(length) { return randomBytes(length); };";

var transforms = {
    // Remove the precomputed secp256k1 points
    "elliptic/lib/elliptic/precomputed/secp256k1.js": undef,

    // Remove curves we don't care about
    "elliptic/curve/edwards.js": empty,
    "elliptic/curve/mont.js": empty,
    "elliptic/lib/elliptic/eddsa/.*": empty,

    // We only use the version from this JSON package
    "elliptic/package.json" : ellipticPackage,

    // Remove RIPEMD160
    "hash.js/lib/hash/ripemd.js": "module.exports = {ripemd160: null}",

    // Swap out borland for the random bytes we already have
    "brorand/index.js": brorand,

    // Used by sha3 if it exists; (so make it no exist)
    "process/.*": undef,
};

var modified = {};
var unmodified = {};

function transformFile(path) {
    for (var pattern in transforms) {
        if (path.match(new RegExp('/' + pattern + '$'))) {
            modified[pattern] = true;
            return transforms[pattern];
        }
    }
    return null;
}

function transform(path, options) {
    var data = '';

    return through(function(chunk) {
        data += chunk;
    }, function () {
        var transformed = transformFile(path);
        if (transformed != null) {
            data = transformed;
        } else {
            unmodified[path] = true;
        }
        this.queue(data);
        this.queue(null);
    });
}

var inflight = 0;

function preBundle(bundle) {
    inflight++;
}

function postBundle(error, source, next) {
    if (error) {
        console.log(error);

    } else {
        // We setup the utils instance to be able to create a stand-alone package
        source = source.toString();
        var lengthBefore = source.length;
        var source = source.replace(/"__STAND_ALONE_FALSE__"/g, '"__STAND_ALONE_TRUE__"');
        if (lengthBefore - source.length !== 1) {
            next(new Error('multiple stand-alone variables changed'));
            return;
        }
    }

    inflight--
    if (inflight === 0) {

        // List all files that passed though unchanged
        var preserved = {};
        Object.keys(unmodified).forEach(function(filename) {
            var match = filename.match(/(node_modules.*)$/);
            if (!match) {
                match = filename.match(/(ethers\.js.*)$/);
            }
            if (!match) {
                match = [null, filename];
            }
            preserved[match[1]] = true;
        });
        preserved = Object.keys(preserved);
        preserved.sort();
        console.log('Preserved:');
        preserved.forEach(function(path) {
            console.log('  ', path);
        });

        // Make sure there were no replacement patterns that went unused
        var skipped = [];
        for (var key in transforms) {
            if (!modified[key]) { skipped.push(key); }
        }
        skipped.sort();
        if (skipped.length) {
            console.log('Unused Patterns:');
            skipped.forEach(function(pattern) {
                console.log('  ', pattern);
            });
        }
    }

    next(error, source);
}

module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      dist: {
        files: {
            'dist/ethers.js': './index.js',
            'dist/ethers-contracts.js': './contracts/index.js',
            'dist/ethers-providers.js': './providers/index.js',
            'dist/ethers-utils.js': './utils/index.js',
            'dist/ethers-wallet.js': './wallet/index.js',
        },
        options: {
          transform: [
              [ transform, { global: true } ],
          ],
          browserifyOptions: {
            //standalone: '_ethers',
          },
          preBundleCB: preBundle,
          postBundleCB: postBundle
        },
      },
    },
    uglify: {
      dist: {
        files: {
          'dist/ethers.min.js' : [ './dist/ethers.js' ],
          'dist/ethers-contracts.min.js' : [ './dist/ethers-contracts.js' ],
          'dist/ethers-providers.min.js' : [ './dist/ethers-providers.js' ],
          'dist/ethers-utils.min.js' : [ './dist/ethers-utils.js' ],
          'dist/ethers-wallet.min.js' : [ './dist/ethers-wallet.js' ],
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('dist', ['browserify', 'uglify']);
};
