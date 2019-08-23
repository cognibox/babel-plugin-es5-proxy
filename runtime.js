/* eslint-disable prefer-rest-params, no-var, comma-dangle */
var OBJECT_FUNCTIONS = [
  Object.assign,
  Object.create,
  Object.defineProperties,
  Object.defineProperty,
  Object.entries,
  Object.freeze,
  Object.fromEntries,
  Object.getOwnPropertyDescriptor,
  Object.getOwnPropertyDescriptors,
  Object.getOwnPropertyNames,
  Object.getOwnPropertySymbols,
  Object.getPrototypeOf,
  Object.is,
  Object.isExtensible,
  Object.isFrozen,
  Object.isSealed,
  Object.keys,
  Object.preventExtensions,
  Object.seal,
  Object.setPrototypeOf,
  Object.values
];

function inObject(value) {
  for (var i = 0; i < OBJECT_FUNCTIONS.length; i++) {
    if (OBJECT_FUNCTIONS[i] === value) return true;
  }
  return false;
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
  if (typeof value === 'function' && inObject(value)) {
    return function() {
      arguments[0] = objectTarget(arguments[0]);

      return value.apply(Object, arguments);
    };
  }
  return value;
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
  return object && object.constructor && object.constructor.toString().split(' ')[1].match(/__proxy_/);
}

function objectTarget(object) {
  return isProxy(object) ? object.target : object;
}

function Proxy(target, handlers) { // eslint-disable-line no-unused-vars
  if (target === undefined || handlers === undefined) throw TypeError('Cannot create proxy with a non-object as target or handler');
  this.target = target;

  this.get = function(property) {
    return (handlers.get || globalGetter)(target, property);
  };

  this.has = function(property) {
    return (handlers.has || globalHas)(target, property);
  };

  this.set = function(property, value) {
    return (handlers.set || globalSetter)(target, property, value);
  };

  this.deleteProperty = function(property) {
    return (handlers.deleteProperty || globalDeleter)(target, property);
  };

  this.instanceOf = function(cls) {
    return this.target instanceof cls;
  };
}

/* eslint-enable prefer-rest-params, no-var, comma-dangle */
