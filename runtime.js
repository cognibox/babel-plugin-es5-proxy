/* eslint-disable prefer-rest-params, no-var, comma-dangle, prefer-template, no-eval, prefer-spread, prefer-arrow-callback, no-invalid-this */
window.toStringBackup = window.toStringBackup || Function.prototype.toString;

(function() { //eslint-disable-line
  if (window.nativePatchCalled) return;

  function buildNativeless(nativeFn, newFn) {
    nativeFn.__$nativeless$__ = newFn;
  }

  function buildObjectAssign() {
    buildNativeless(Object.assign, function() {
      var target = arguments[0];

      var sources = [];
      var argumentLength = arguments.length;

      var i;

      if (argumentLength > 1) {
        for (i = 1; i < argumentLength; i++) {
          sources[i] = formatTargetObject(arguments[i], false);
        }
      }

      if (isProxy(target)) {
        if (argumentLength === 1) return target;

        for (i = 1; i < argumentLength; i++) {
          var source = sources[i];
          var keys = Object.keys(source);

          for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            var key = keys[keyIndex];

            target.set(key, source[key]);
          }
        }

        return target;
      }

      sources.unshift(target);
      return Object.assign.apply(this, sources);
    });
  }

  function buildObjectCreate() {
    var backup = Object.create;

    buildNativeless(Object.create, function(proto, propertiesObject) {
      var argumentLength = arguments.length;
      for (var i = 0; i < argumentLength; i++) {
        if (isProxy(arguments[i])) {
          throw TypeError('Cannot call Object.create with a proxy');
        }
      }

      return backup.call(Object, proto, propertiesObject);
    });
  }

  function buildSetPrototypeOf() {
    var backup = Object.setPrototypeOf;

    buildNativeless(Object.setPrototypeOf, function(obj, proto) {
      if (isProxy(obj) || isProxy(proto)) {
        throw '[babel-plugin-es5-proxy] \'Object.setPrototypeOf\' not implemented with proxy as arguments'; //eslint-disable-line
      }

      return backup.call(Object, obj, proto);
    });
  }

  function buildConcat() {
    var backup = Array.prototype.concat;

    buildNativeless(Array.prototype.concat, function() { //eslint-disable-line
      var target = isProxy(this) ? this.formatTarget() : this;
      var argLen = arguments.length;
      var args = [];
      for (var argIndex = 0; argIndex < argLen; argIndex++) {
        var arg = arguments[argIndex];
        args[argIndex] = isProxy(arg) ? arg.formatTarget() : arg;
      }

      return backup.apply(target, args);
    });
  }

  function buildDefineProperties() {
    var backup = Object.defineProperties;

    buildNativeless(Object.defineProperties, function(obj, props) { //eslint-disable-line
      var args = [objectTarget(obj), formatTargetObject(props, true)];

      return backup.apply(this, args);
    });
  }

  function buildDefineProperty() {
    var backup = Object.defineProperty;

    buildNativeless(Object.defineProperty, function(obj, prop, descriptor) { //eslint-disable-line
      var args = [objectTarget(obj), prop, formatTargetObject(descriptor, true)];

      return backup.apply(this, args);
    });
  }

  function buildPop() {
    var backup = Array.prototype.pop;

    buildNativeless(Array.prototype.pop, function() { //eslint-disable-line
      if (isProxy(this)) {
        var length = this.get('length');
        var value = this.get(length - 1);

        backup.apply(this.target(), arguments);

        return value;
      }

      return backup.apply(this, arguments);
    });
  }

  function buildShift() {
    var backup = Array.prototype.shift;

    buildNativeless(Array.prototype.shift, function() { //eslint-disable-line
      if (isProxy(this)) {
        var value = this.get(0);

        backup.apply(this.target(), arguments);

        return value;
      }

      return backup.apply(this, arguments);
    });
  }

  function buildReverse() {
    var backup = Array.prototype.reverse;

    buildNativeless(Array.prototype.reverse, function() { //eslint-disable-line
      var target = objectTarget(this);

      var thisIsProxy = isProxy(this);

      var index, length, middleIndex;
      if (thisIsProxy) {
        length = this.get('length');
        middleIndex = (length - 1) / 2; // eslint-disable-line no-magic-numbers
        middleIndex = Math.round(middleIndex) === middleIndex ? middleIndex : -1;
        for (index = 0; index < length; index++) {
          target[index] = middleIndex === index ? this.target()[index] : this.get(index);
        }
      }

      backup.apply(target, arguments);

      if (thisIsProxy) {
        for (index = 0; index < length; index++) {
          if (middleIndex !== index) this.set(index, target[index]);
        }
      }

      return this;
    });
  }

  function buildSort() {
    var backup = Array.prototype.sort;

    buildNativeless(Array.prototype.sort, function() { //eslint-disable-line
      var target = objectTarget(this);

      if (isProxy(this)) {
        var length = this.get('length');
        var newArray = this.formatTarget();

        backup.apply(newArray, arguments);

        target.length = 0;
        for (var i = 0; i < length; i++) {
          this.set(i, newArray[i]);
        }
      } else {
        backup.apply(target, arguments);
      }

      return this;
    });
  }

  function buildSplice() {
    var backup = Array.prototype.splice;

    buildNativeless(Array.prototype.splice, function(start, deleteCount) { //eslint-disable-line
      if (isProxy(this)) {
        var len = this.get('length');
        var relativeStart = parseInt(start, 10);

        if (relativeStart < 0) {
          start = Math.max(len + relativeStart, 0);
        } else {
          start = Math.min(relativeStart, len);
        }

        var items = [];
        var argLength = arguments.length;
        for (var i = 2; i < argLength; i++) {
          items[i - 2] = arguments[i]; //eslint-disable-line no-magic-numbers
        }

        var nbr = start + deleteCount;

        var deletedElements = [];
        for (i = start; i < nbr; i++) {
          deletedElements[i - start] = this.get(i);
        }

        var toKeep = [];
        for (i = nbr; i < len; i++) {
          toKeep[i - nbr] = this.get(i);
        }

        var itemToAddLength = items.length;
        var toKeepLength = toKeep.length;

        this.set('length', start + itemToAddLength + toKeepLength);

        for (i = 0; i < itemToAddLength; i++) {
          this.set(start + i, items[i]);
        }

        for (i = 0; i < toKeepLength; i++) {
          this.set(start + i + itemToAddLength, toKeep[i]);
        }

        return deletedElements;
      }

      return backup.apply(this, arguments);
    });
  }

  function buildFunctions(fnNames, fn) {
    var len = fnNames.length;
    for (var elementIndex = 0; elementIndex < len; elementIndex++) {
      var element = fnNames[elementIndex];
      fn(element);
    }
  }

  function buildWithThisAsFormattedTarget(fnName) {
    var backup = eval(fnName);

    var fn = function() { //eslint-disable-line
      var target = isProxy(this) ? this.formatTarget() : this; //eslint-disable-line no-invalid-this
      return backup.apply(target, arguments);
    };

    buildNativeless(fnName, fn);
  }

  function buildWithThisAsTarget(fnName) {
    var backup = eval(fnName);

    var fn = function() { //eslint-disable-line
      return backup.apply(objectTarget(this), arguments); //eslint-disable-line no-invalid-this
    };

    buildNativeless(fnName, fn);
  }

  function buildWithFirstParamAsTarget(fnName) {
    var backup = eval(fnName);

    var fn = function() { //eslint-disable-line
      var argLen = arguments.length;
      var args = [objectTarget(arguments[0])];
      for (var argIndex = 1; argIndex < argLen; argIndex++) {
        args[argIndex] = arguments[argIndex];
      }
      return backup.apply(this, args); //eslint-disable-line no-invalid-this
    };

    buildNativeless(fnName, fn);
  }

  buildObjectAssign();
  buildConcat();
  buildDefineProperty();
  buildDefineProperties();
  buildObjectCreate();
  buildPop();
  buildReverse();
  buildSetPrototypeOf();
  buildShift();
  buildSort();
  buildSplice();

  buildFunctions([
    Object.prototype.hasOwnProperty,
    Object.prototype.propertyIsEnumerable,
    Object.prototype.toLocaleString,
    Object.prototype.toString,
    Object.prototype.__defineGetter__,
    Object.prototype.__defineSetter__,
    Object.prototype.__lookupGetter__,
    Object.prototype.__lookupSetter__,
    Array.prototype.push,
    Array.prototype.unshift
  ], buildWithThisAsTarget);

  buildFunctions([
    Object.getOwnPropertyDescriptor,
    Object.freeze,
    Object.getOwnPropertyNames,
    Object.getPrototypeOf,
    Object.isExtensible,
    Object.isFrozen,
    Object.isSealed,
    Object.keys,
    Object.preventExtensions,
    Object.seal,
    Object.prototype.isPrototypeOf,
    Array.isArray
  ], buildWithFirstParamAsTarget);

  buildFunctions([
    Array.prototype.join,
    Array.prototype.slice,
    Array.prototype.toLocaleString,
    Array.prototype.toString,
    Array.prototype.some,
    Array.prototype.filter,
    Array.prototype.every,
    Array.prototype.reduce,
    Array.prototype.reduceRight,
    Array.prototype.map,
    Array.prototype.forEach,
    Array.prototype.indexOf,
    Array.prototype.lastIndexOf
  ], buildWithThisAsFormattedTarget);
})();

window.nativePatchCalled = true;

function globalDeleter(object, propertyName) {
  return isProxy(object) ? object.deleteProperty(propertyName) : delete object[propertyName];
}

function globalGetter(object, propertyName, proxy) {
  var value;

  if (isProxy(object)) {
    value = object.get(propertyName, proxy);
  } else {
    var getter = Object.prototype.__lookupGetter__.call(object, propertyName);
    value = getter ? getter.call(proxy || object) : object[propertyName];
  }
  return value;
}

function globalMemberCaller(target, property, args) { // eslint-disable-line no-unused-vars
  var fn = globalGetter(target, property);
  return globalCaller(fn, target, args);
}

function globalCaller(fn, target, args) {
  if (fn === Function.prototype.call) {
    fn = target;
    target = args[0];
    args = args.slice(1);
  } else if (fn === Function.prototype.apply) {
    fn = target;
    target = args[0];
    args = args[1] || [];
  }

  if (fn.__$nativeless$__) {
    fn = fn.__$nativeless$__;
  }

  return fn.apply(target, args);
}

function globalHas(object, propertyName) {
  return isProxy(object) ? object.has(propertyName) : propertyName in object;
}

function globalInstanceof(object, cls) { // eslint-disable-line no-unused-vars
  return isProxy(object) ? object.instanceOf(cls) : object instanceof cls;
}

function globalSetter(object, propertyName, value) {
  if (isProxy(object)) {
    return object.set(propertyName, value);
  }
  object[propertyName] = value;
  return value;
}

function isProxy(object) {
  return object instanceof window.Proxy;
}

function objectTarget(object) {
  return isProxy(object) ? objectTarget(object.target()) : object;
}

if (!window.Proxy) {
  window.Proxy = function(target, handlers) {
    if (target === undefined || handlers === undefined) throw TypeError('Cannot create proxy with a non-object as target or handler');

    if (handlers.getPrototypeOf) throw TypeError('[babel-plugin-es5-proxy] handler \'getPrototypeOf\' not implemented');
    if (handlers.setPrototypeOf) throw TypeError('[babel-plugin-es5-proxy] handler \'setPrototypeOf\' not implemented');
    if (handlers.isExtensible) throw TypeError('[babel-plugin-es5-proxy] handler \'isExtensible\' not implemented');
    if (handlers.preventExtensions) throw TypeError('[babel-plugin-es5-proxy] handler \'preventExtensions\' not implemented');
    if (handlers.getOwnPropertyDescriptor) throw TypeError('[babel-plugin-es5-proxy] handler \'getOwnPropertyDescriptor\' not implemented');
    if (handlers.defineProperty) throw TypeError('[babel-plugin-es5-proxy] handler \'defineProperty\' not implemented');
    if (handlers.ownKeys) throw TypeError('[babel-plugin-es5-proxy] handler \'ownKeys\' not implemented');
    if (handlers.apply) throw TypeError('[babel-plugin-es5-proxy] handler \'apply\' not implemented');
    if (handlers.construct) throw TypeError('[babel-plugin-es5-proxy] handler \'construct\' not implemented');

    this.target = function() {
      return target;
    };

    this.get = function(property, proxy) {
      if (handlers.get) {
        return handlers.get.call(this, target, property);
      }

      return globalGetter(target, property, proxy || this);
    };

    this.has = function(property) {
      if (handlers.has) {
        return !!handlers.has.call(this, target, property);
      }

      return !!globalHas(target, property);
    };

    this.set = function(property, value) {
      if (handlers.set) {
        handlers.set.call(this, target, property, value);
      } else {
        globalSetter(target, property, value);
      }

      return value;
    };

    this.deleteProperty = function(property) {
      if (handlers.deleteProperty) {
        handlers.deleteProperty.call(this, target, property);
      } else {
        globalDeleter(target, property);
      }

      return true;
    };

    this.instanceOf = function(cls) {
      return this.target() instanceof cls;
    };
  };

  window.Proxy.prototype.toJSON = function() {
    return this.formatTarget();
  };

  window.Proxy.prototype.formatTarget = function() {
    return Array.isArray.__$nativeless$__(this.target()) ? this.formatTargetArray() : this.formatTargetObject();
  };

  window.Proxy.prototype.formatTargetArray = function() {
    var newArr = [];
    var length = this.get('length', this);
    for (var i = 0; i < length; i++) {
      newArr[i] = this.get(i);
    }

    return newArr;
  };

  window.Proxy.prototype.formatTargetObject = function(deep) {
    return formatTargetObject(this, deep);
  };
}

function formatTargetObject(obj, deep) {
  if (!isProxy(obj)) return obj;

  var newObj = {};
  var keys = Object.getOwnPropertyNames.__$nativeless$__.call(Object, obj.target());
  var keyLength = keys.length;
  for (var i = 0; i < keyLength; i++) {
    var key = keys[i];
    var descriptor = Object.getOwnPropertyDescriptor.__$nativeless$__.call(Object, obj, key);
    descriptor.value = obj.get(key, obj);

    if (deep && descriptor.value) {
      descriptor.value = formatTargetObject(descriptor.value, deep);
    }

    Object.defineProperty(newObj, key, descriptor);
  }
  return newObj;
}

/* eslint-enable prefer-rest-params, no-var, comma-dangle */
