/* eslint-disable prefer-rest-params, no-var, comma-dangle, prefer-template, no-eval, prefer-spread */
window.toStringBackup = window.toStringBackup || Function.prototype.toString;

// (function() { //eslint-disable-line
//   var backup = Object.assign;
//   Object.assign = function() {
//     var argLen = arguments.length;
//     var args = [arguments[0]];
//     for (var i = 1; i < argLen; i++) {
//       args[i] = objectTarget(arguments[i]);
//     }

//     if (isProxy(args[0])) {
//       var proxy = args[0];
//       for (var argIndex = 1; argIndex < argLen; argIndex++) {
//         var source = args[argIndex];
//         var sourceKeys = Object.keys(source);
//         var sourceKeyLength = sourceKeys.length;
//         for (var sourceKeyIndex = 0; sourceKeyIndex < sourceKeyLength; sourceKeyIndex++) {
//           var sourceKey = sourceKeys[sourceKeyIndex];
//           var sourceValue = source[sourceKey];
//           proxy.set(sourceKey, sourceValue);
//         }
//       }

//       return proxy;
//     }

//     return backup.apply(undefined, args);
//   };
// })();

(function() { //eslint-disable-line
  if (window.__me__stuff__executed) return;

  function buildObjectCreate() {
    var backup = Object.create;

    function isObject(obj) {
      return typeof obj === 'object' && obj !== null;
    }

    function buildObject(obj) {
      if (!isObject(obj) || !isProxy(obj)) return obj;

      return obj.formatTarget();
    }

    Object.create = function(proto, propertiesObject) {
      var newProto = buildObject(proto);
      var newPropertiesObject = buildObject(propertiesObject);

      return backup.call(Object, newProto, newPropertiesObject);
    };
  }

  function buildSetPrototypeOf() {
    var backup = Object.setPrototypeOf;

    Object.setPrototypeOf = function(obj, proto) {
      if (isProxy(obj) || isProxy(proto)) {
        throw '[babel-plugin-es5-proxy] \'Object.setPrototypeOf\' not implemented with proxy as arguments'; //eslint-disable-line
      }

      return backup.call(Object, obj, proto);
    };
  }

  function buildConcat() {
    var backup = Array.prototype.concat;

    Array.prototype.concat = function() { //eslint-disable-line
      var self = isProxy(this) ? this.formatTarget() : this;
      var argLen = arguments.length;
      var args = [];
      for (var argIndex = 0; argIndex < argLen; argIndex++) {
        var arg = arguments[argIndex];
        args[argIndex] = isProxy(arg) ? arg.formatTarget() : arg;
      }

      return backup.apply(self, args);
    };
  }

  function buildPop() {
    var backup = Array.prototype.pop;

    Array.prototype.pop = function() { //eslint-disable-line
      if (isProxy(this)) {
        var length = this.get('length');
        var value = this.get(length - 1);

        backup.apply(this.target(), arguments);

        return value;
      }

      return backup.apply(this, arguments);
    };
  }

  function buildShift() {
    var backup = Array.prototype.shift;

    Array.prototype.shift = function() { //eslint-disable-line
      if (isProxy(this)) {
        var value = this.get(0);

        backup.apply(this.target(), arguments);

        return value;
      }

      return backup.apply(this, arguments);
    };
  }

  function buildReverse() {
    var backup = Array.prototype.reverse;

    Array.prototype.reverse = function() { //eslint-disable-line
      var target = objectTarget(this);

      if (isProxy(this)) {
        var length = this.get('length');
        for (var i = 0; i < length; i++) {
          target[i] = this.get(i);
        }
      }

      backup.apply(target, arguments);
      return this;
    };
  }

  function buildSort() {
    var backup = Array.prototype.sort;

    Array.prototype.sort = function() { //eslint-disable-line
      var target = objectTarget(this);

      if (isProxy(this)) {
        var length = this.get('length');
        var newArray = this.formatTarget();

        backup.apply(newArray, arguments);

        target.length = 0;
        for (var i = 0; i < length; i++) {
          target[i] = newArray[i];
        }
      } else {
        backup.apply(target, arguments);
      }

      return this;
    };
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
      var self = isProxy(this) ? this.formatTarget() : this;
      return backup.apply(self, arguments);
    };

    eval(fnName + ' = fn;');
  }

  function buildWithThisAsTarget(fnName) {
    var backup = eval(fnName);

    var fn = function() { //eslint-disable-line
      return backup.apply(objectTarget(this), arguments);
    };

    eval(fnName + ' = fn;');
  }

  function buildWithFirstParamAsTarget(fnName) {
    var backup = eval(fnName);

    var fn = function() { //eslint-disable-line
      var argLen = arguments.length;
      var args = [objectTarget(arguments[0])];
      for (var argIndex = 1; argIndex < argLen; argIndex++) {
        args[argIndex] = arguments[argIndex];
      }
      return backup.apply(this, args);
    };

    eval(fnName + ' = fn;');
  }

  buildObjectCreate();
  buildSetPrototypeOf();
  buildConcat();
  buildPop();
  buildReverse();
  buildShift();
  buildSort();

  buildFunctions([
    'Object.prototype.hasOwnProperty',
    'Object.prototype.propertyIsEnumerable',
    'Object.prototype.toLocaleString',
    'Object.prototype.toString',
    'Object.prototype.__defineGetter__',
    'Object.prototype.__defineSetter__',
    'Object.prototype.__lookupGetter__',
    'Object.prototype.__lookupSetter__',
    'Array.prototype.push'
  ], buildWithThisAsTarget);

  buildFunctions([
    'Object.defineProperties',
    'Object.defineProperty',
    'Object.getOwnPropertyDescriptor',
    'Object.freeze',
    'Object.getOwnPropertyNames',
    'Object.isExtensible',
    'Object.isFrozen',
    'Object.isSealed',
    'Object.keys',
    'Object.preventExtensions',
    'Object.seal',
    'Object.prototype.isPrototypeOf',
    'Array.isArray'
  ], buildWithFirstParamAsTarget);

  buildFunctions([
    'Array.prototype.join',
    'Array.prototype.slice'
  ], buildWithThisAsFormattedTarget);
})();

window.__me__stuff__executed = true;

function isNativeCode(fn) {
  return !!window.toStringBackup.call(fn).match(/\[native code\]/);
}

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
  return isProxy(object) ? object.target() : object;
}

function objectTargets(objects) {
  var targets = [];
  for (var i = 0; i < objects.length; i++) {
    targets.push(objectTarget(objects[i]));
  }
  return targets;
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
        handlers.has.call(this, target, property);
      }

      return !!globalHas(target, property);
    };

    this.set = function(property, value) {
      if (handlers.set) {
        handlers.set.call(this, target, property, value);
      }

      globalSetter(target, property, value);

      return value;
    };

    this.deleteProperty = function(property) {
      if (handlers.deleteProperty) {
        handlers.deleteProperty.call(this, target, property);
      }

      globalDeleter(target, property);

      return true;
    };

    this.instanceOf = function(cls) {
      return this.target() instanceof cls;
    };
  };

  window.Proxy.prototype.formatTarget = function() {
    return Array.isArray(this.target()) ? this.formatTargetArray() : this.formatTargetObject();
  };

  window.Proxy.prototype.formatTargetArray = function() {
    var newArr = [];
    var length = this.get('length', this);
    for (var i = 0; i < length; i++) {
      newArr[i] = this.get(i);
    }

    return newArr;
  };

  window.Proxy.prototype.formatTargetObject = function() {
    var newObj = {};
    var keys = Object.getOwnPropertyNames(this.target());
    var keyLength = keys.length;
    for (var i = 0; i < keyLength; i++) {
      var key = keys[i];
      newObj[key] = this.get(key, this);
    }
    return newObj;
  };
}

/* eslint-enable prefer-rest-params, no-var, comma-dangle */
