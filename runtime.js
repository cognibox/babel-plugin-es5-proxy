'use strict';

function defaultGet(property) {
  return this[property]; // eslint-disable-line no-invalid-this
}

const _eval = eval; // eslint-disable-line no-eval, no-unused-vars

function defaultSet(property, value) {
  this[property] = value; // eslint-disable-line no-invalid-this
  return value;
}

function Proxy2(target, handlers = {}) { // eslint-disable-line no-unused-vars
  this.target = target;
  this.get = (handlers.get || defaultGet).bind(this.target);
  this.set = (handlers.set || defaultSet).bind(this.target);
}

function globalGetter(object, propertyName) { // eslint-disable-line no-unused-vars
  return (object.constructor.name === 'Proxy2') ? object.get(propertyName) : object[propertyName];
}

function objectTarget(object) { // eslint-disable-line no-unused-vars
  return (object.constructor.name === 'Proxy2') ? object.target : object;
}

function globalSetter(object, propertyName, value) { // eslint-disable-line no-unused-vars
  if (object.constructor.name === 'Proxy2') {
    return object.set(propertyName, value);
  }
  object[propertyName] = value;
  return value;
}
