/* eslint-disable prefer-rest-params, no-var, comma-dangle */

function isNativeCode(fn) {
  return fn.toString().slice(-19) === ') { [native code] }'; // eslint-disable-line no-magic-numbers
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
  if (typeof value === 'function' && isNativeCode(value)) {
    return function() {
      try {
        return value.apply(objectTarget(this), objectTargets(arguments)); // eslint-disable-line no-invalid-this
      } catch (error) {
        if (error instanceof TypeError) {
          return new (Function.prototype.bind.apply(value, [this].concat(objectTargets(arguments))))(); // eslint-disable-line no-invalid-this
        }
        throw error;
      }
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
  return object instanceof window.Proxy;
}

function objectTarget(object) {
  return isProxy(object) ? object.target : object;
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
  this.target = target;

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
    return this.target instanceof cls;
  };
};

/* eslint-enable prefer-rest-params, no-var, comma-dangle */
