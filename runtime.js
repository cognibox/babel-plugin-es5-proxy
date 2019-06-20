'use strict';

function defaultGet(property) {
  return this[property];
}

function defaultSet(property, value) {
  this[property] = value;
}

function Proxy(target, handlers = {}) {
  this.target = target;
  this.get = (handlers.get || defaultGet).bind(this.target);
  this.set = (handlers.set || defaultSet).bind(this.target);
};

function globalGetter(object, propertyName) {
  var value, self;

  if (object instanceof Proxy) {
    value = object.get(propertyName);
    self = object.target;
  } else {
    value = object[propertyName];
    self = object;
  }

  if (typeof value === 'function') {
      return value.bind(self);
  } else {
      return value;
  }
}

function globalSetter(object, propertyName, value) {
  if (object instanceof Proxy) {
    object.set(propertyName, value);
  } else {
    object[propertyName] = value;
  }
}
