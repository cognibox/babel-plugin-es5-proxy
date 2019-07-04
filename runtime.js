function globalDeleter(object, propertyName) {
  return isProxy(object) ? object.deleteProperty(propertyName) : delete object[propertyName];
}

function globalGetter(object, propertyName) {
  return (isProxy(object)) ? object.get(propertyName) : object[propertyName];
}

function globalSetter(object, propertyName, value) {
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
    return (handlers.get || globalGetter)(target, property);
  };

  this.set = function(property, value) {
    return (handlers.set || globalSetter)(target, property, value);
  };

  this.deleteProperty = function(property) {
    return (handlers.deleteProperty || globalDeleter)(target, property);
  };
}
