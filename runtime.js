'use strict';

function defaultGet(property) {
  return this[property]; //eslint-disable-line no-invalid-this
}

function defaultSet(property, value) {
  this[property] = value; //eslint-disable-line no-invalid-this
  return value;
}

function Proxy(target, handlers = {}) {
  this.target = target;
  this.get = (handlers.get || defaultGet).bind(this.target);
  this.set = (handlers.set || defaultSet).bind(this.target);
}

function globalGetter(object, propertyName) { // eslint-disable-line no-unused-vars
  return (object instanceof Proxy) ? object.get(propertyName) : object[propertyName];
}

function objectTarget(object) {
  return (object instanceof Proxy) ? object.target : object;
}

function globalSetter(object, propertyName, value) { // eslint-disable-line no-unused-vars
  if (object instanceof Proxy) {
    return object.set(propertyName, value);
  }
  object[propertyName] = value;
  return value;
}
