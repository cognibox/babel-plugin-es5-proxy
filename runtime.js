function defaultGet(object, property) {
  return globalGetter(object, property);
}

function defaultSet(object, property, value) {
  return globalSetter(object, property, value);
}

function globalGetter(object, propertyName) { // eslint-disable-line no-unused-vars
  return (isProxy(object)) ? object.get(propertyName) : object[propertyName];
}

function globalSetter(object, propertyName, value) { // eslint-disable-line no-unused-vars
  if (isProxy(object)) {
    return object.set(propertyName, value);
  }
  object[propertyName] = value;
  return value;
}

function isProxy(object) {
  return object.constructor && object.constructor.name === 'Proxy';
}

function Proxy(target, handlers = {}) { // eslint-disable-line no-unused-vars
  this.get = function(property) {
    return (handlers.get || defaultGet)(target, property);
  };

  this.set = function(property, value) {
    return (handlers.set || defaultSet)(target, property, value);
  };
}
