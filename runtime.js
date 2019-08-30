/* eslint-disable prefer-rest-params, no-var, comma-dangle */
window.toStringBackup = window.toStringBackup || Function.prototype.toString;

function isNativeCode(fn) {
  return !!window.toStringBackup.call(fn).match(/\[native code\]/);
}

function globalDeleter(object, propertyName) {
  return isProxy(object) ? object.deleteProperty(propertyName) : delete object[propertyName];
}

function globalGetter(object, propertyName) {
  var value;
  if (isProxy(object)) {
    value = object.get(propertyName);
  } else {
    value = object[propertyName];
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
  if (fn !== Function.prototype.toString && isNativeCode(fn)) {
    return fn.apply(objectTarget(target), objectTargets(args));
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

window.Proxy = window.Proxy || function(target, handlers) {
  if (target === undefined || handlers === undefined) throw TypeError('Cannot create proxy with a non-object as target or handler');

  this.target = function() {
    return target;
  };

  this.get = function(property) {
    return (handlers.get || globalGetter)(target, property);
  };

  this.has = function(property) {
    return !!(handlers.has || globalHas)(target, property);
  };

  this.set = function(property, value) {
    (handlers.set || globalSetter)(target, property, value);
    return value;
  };

  this.deleteProperty = function(property) {
    (handlers.deleteProperty || globalDeleter)(target, property);
    return true;
  };

  this.instanceOf = function(cls) {
    return this.target() instanceof cls;
  };
};

/* eslint-enable prefer-rest-params, no-var, comma-dangle */
