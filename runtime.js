'use strict';

var defaultHandler = {
    get: function get(propName) {
        return object[propName];
    },
    set: function set(propName, val) {
        object[propName] = val;
    }
};

var Proxy = function Proxy(target, handler) {
    this.target = target;
    this.get = handler.get || defaultHandler.get;
    this.set = handler.set || defaultHandler.set;
};

// Proxy.prototype.getTrap = function (propertyName) {
//     return this.get(this.target, propertyName);
// };

// Proxy.prototype.setTrap = function (propertyName, value) {
//     this.set(this.target, propertyName, value);
// };

function globalGetInterceptor(object, propertyName) {
    if (object instanceof Proxy) {
        return object.get(object.target, propertyName);
    }
    var value = object[propertyName];
    if (typeof value === 'function') {
        return value.bind(object);
    } else {
        return value;
    }
}

function globalSetInterceptor(object, propertyName, value) {
    if (object instanceof Proxy) {
        return object.setTrap(propertyName, value);
    }
    object[propertyName] = value;
}



globalGetInterceptor(this, 'stuff')();
