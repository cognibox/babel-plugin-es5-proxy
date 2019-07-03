function defaultGet(object, property) {
  return object[property];
}

function defaultSet(object, property, value) {
  object[property] = value;
  return value;
}

function globalGetter(object, propertyName) { // eslint-disable-line no-unused-vars
  return (isProxy(object)) ? object.get(object.target, propertyName) : object[propertyName];
}

function globalSetter(object, propertyName, value) { // eslint-disable-line no-unused-vars
  if (isProxy(object)) {
    return object.set(object.target, propertyName, value);
  }
  object[propertyName] = value;
  return value;
}

function isProxy(object) {
  return object.constructor && object.constructor.name === 'Proxy';
}

function objectTarget(object) { // eslint-disable-line no-unused-vars
  return (isProxy(object)) ? object.target : object;
}

function Proxy(target, handlers = {}) { // eslint-disable-line no-unused-vars
  this.target = target;
  this.get = handlers.get || defaultGet;
  this.set = handlers.set || defaultSet;
}
