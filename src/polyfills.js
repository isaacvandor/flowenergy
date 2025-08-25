// Mobile Safari Polyfills
// Load these before React to ensure compatibility

// Promise polyfill for older Safari versions
if (typeof Promise === 'undefined') {
  window.Promise = require('promise/lib/es6-extensions.js');
}

// Fetch polyfill for Safari < 10.1
if (typeof fetch === 'undefined') {
  require('whatwg-fetch');
}

// Object.assign polyfill for Safari < 9
if (typeof Object.assign !== 'function') {
  Object.assign = function(target, varArgs) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Array.from polyfill for Safari < 9
if (!Array.from) {
  Array.from = function(arrayLike, mapFn, thisArg) {
    var C = this;
    var items = Object(arrayLike);
    if (arrayLike == null) {
      throw new TypeError('Array.from requires an array-like object - not null or undefined');
    }
    var mapFunction = arguments.length > 1 ? mapFn : void undefined;
    var T;
    if (typeof mapFunction !== 'undefined') {
      if (typeof mapFunction !== 'function') {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }
      if (arguments.length > 2) {
        T = thisArg;
      }
    }
    var len = parseInt(items.length);
    var A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
    var k = 0;
    var kValue;
    while (k < len) {
      kValue = items[k];
      if (mapFunction) {
        A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
      } else {
        A[k] = kValue;
      }
      k += 1;
    }
    A.length = len;
    return A;
  };
}

// String.padStart polyfill for Safari < 10
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0;
    padString = String(typeof padString !== 'undefined' ? padString : ' ');
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length);
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}

// Set polyfill for Safari < 7.1
if (typeof Set === 'undefined') {
  window.Set = function Set(iterable) {
    this._values = [];
    this.size = 0;

    if (iterable) {
      for (var i = 0; i < iterable.length; i++) {
        this.add(iterable[i]);
      }
    }
  };

  Set.prototype.add = function(value) {
    if (this._values.indexOf(value) === -1) {
      this._values.push(value);
      this.size++;
    }
    return this;
  };

  Set.prototype.has = function(value) {
    return this._values.indexOf(value) !== -1;
  };

  Set.prototype.delete = function(value) {
    var index = this._values.indexOf(value);
    if (index !== -1) {
      this._values.splice(index, 1);
      this.size--;
      return true;
    }
    return false;
  };

  Set.prototype.clear = function() {
    this._values = [];
    this.size = 0;
  };

  Set.prototype.forEach = function(callback, thisArg) {
    for (var i = 0; i < this._values.length; i++) {
      callback.call(thisArg, this._values[i], this._values[i], this);
    }
  };
}

// Console polyfill for very old Safari versions
if (typeof console === 'undefined') {
  window.console = {
    log: function() {},
    error: function() {},
    warn: function() {},
    info: function() {}
  };
}

console.log('Mobile Safari polyfills loaded');