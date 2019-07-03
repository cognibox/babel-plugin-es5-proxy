function defaultGet(property) {
  return this[property]; // eslint-disable-line no-invalid-this
}

function defaultSet(property, value) {
  this[property] = value; // eslint-disable-line no-invalid-this
  return value;
}

function globalGetter(object, propertyName) { // eslint-disable-line no-unused-vars
  return (object instanceof Proxy) ? object.get(propertyName) : object[propertyName];
}

function globalSetter(object, propertyName, value) { // eslint-disable-line no-unused-vars
  if (object instanceof Proxy) {
    return object.set(propertyName, value);
  }
  object[propertyName] = value;
  return value;
}

function objectTarget(object) { // eslint-disable-line no-unused-vars
  return (object instanceof Proxy) ? object.target : object;
}

function Proxy(target, handlers = {}) { // eslint-disable-line no-unused-vars
  this.target = target;
  this.get = (handlers.get || defaultGet).bind(this.target);
  this.set = (handlers.set || defaultSet).bind(this.target);
}
