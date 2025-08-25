// Mobile Safari Polyfills - Browser Compatible
// Load these before React to ensure compatibility

console.log('Loading mobile Safari polyfills...');

// Promise polyfill for older Safari versions
if (typeof Promise === 'undefined') {
  // Simple Promise polyfill
  window.Promise = function(executor) {
    var self = this;
    self.state = 'pending';
    self.value = undefined;
    self.handlers = [];
    
    function resolve(result) {
      if (self.state === 'pending') {
        self.state = 'resolved';
        self.value = result;
        self.handlers.forEach(function(handler) {
          handler.onResolve(result);
        });
      }
    }
    
    function reject(error) {
      if (self.state === 'pending') {
        self.state = 'rejected';
        self.value = error;
        self.handlers.forEach(function(handler) {
          handler.onReject(error);
        });
      }
    }
    
    self.then = function(onResolve, onReject) {
      return new Promise(function(resolve, reject) {
        function handle() {
          if (self.state === 'resolved') {
            if (onResolve) {
              try {
                resolve(onResolve(self.value));
              } catch (ex) {
                reject(ex);
              }
            } else {
              resolve(self.value);
            }
          } else if (self.state === 'rejected') {
            if (onReject) {
              try {
                resolve(onReject(self.value));
              } catch (ex) {
                reject(ex);
              }
            } else {
              reject(self.value);
            }
          }
        }
        
        if (self.state !== 'pending') {
          setTimeout(handle, 0);
        } else {
          self.handlers.push({
            onResolve: function(result) {
              if (onResolve) {
                try {
                  resolve(onResolve(result));
                } catch (ex) {
                  reject(ex);
                }
              } else {
                resolve(result);
              }
            },
            onReject: function(error) {
              if (onReject) {
                try {
                  resolve(onReject(error));
                } catch (ex) {
                  reject(ex);
                }
              } else {
                reject(error);
              }
            }
          });
        }
      });
    };
    
    try {
      executor(resolve, reject);
    } catch (ex) {
      reject(ex);
    }
  };
  
  Promise.resolve = function(value) {
    return new Promise(function(resolve) {
      resolve(value);
    });
  };
  
  Promise.reject = function(error) {
    return new Promise(function(resolve, reject) {
      reject(error);
    });
  };
}

// Fetch polyfill for Safari < 10.1
if (typeof fetch === 'undefined') {
  window.fetch = function(url, options) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      var method = (options && options.method) || 'GET';
      
      xhr.open(method, url);
      
      if (options && options.headers) {
        for (var key in options.headers) {
          if (options.headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, options.headers[key]);
          }
        }
      }
      
      xhr.onload = function() {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          text: function() {
            return Promise.resolve(xhr.responseText);
          },
          json: function() {
            return Promise.resolve(JSON.parse(xhr.responseText));
          }
        });
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.send((options && options.body) || null);
    });
  };
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
        // Safe repeat implementation
        var repeated = '';
        var count = Math.ceil(targetLength / padString.length);
        for (var i = 0; i < count; i++) {
          repeated += padString;
        }
        padString = repeated;
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