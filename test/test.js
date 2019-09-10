const expect = require('chai').expect;
const babel = require('@babel/core');

let VALUE;

function randomNumber() {
  const max = 100;
  return Math.round(Math.random() * max);
}

describe('babel-plugin-es5-proxy @medium', () => {
  beforeEach(() => {
    VALUE = randomNumber();
  });

  describe.only('native mocked functions', () => {
    // context('Object.assign', () => {
    //   context('when first argument is proxy', () => {
    //     it('should set each values', () => {
    //       const aValue = VALUE;
    //       const bValue = randomNumber();
    //       const cValue = randomNumber();
    //       const multiplier = 2;
    //       const code = `
    //         var object = { a: ${aValue} };
    //         var proxy = new Proxy(object, {
    //           set: function(target, property, value) {
    //             target[property] = value * ${multiplier};
    //             return true;
    //           }
    //         });
    //         Object.assign(proxy, { b: ${bValue}, c: ${cValue} });

    //         [proxy.b, proxy.c, object.b, object.c]
    //       `;

    //       const output = buildRun(code);

    //       const expectedB = bValue * multiplier;
    //       const expectedC = cValue * multiplier;
    //       expect(output).to.deep.equal([expectedB, expectedC, expectedB, expectedC]);
    //     });
    //   });

    //   context('when second argument is a proxy', () => {
    //     it('should use target', () => {});
    //   });
    // });

    context('Object', () => {
      context('Object.create', () => {
        context('with proxy', () => {
          it('should work', () => {
            const modifier = 3;
            const code = `
              var mainObject = { a: ${VALUE} };
              var mainProxy = new Proxy(mainObject, {
                get: function(target, property) {
                  return target[property] * ${modifier};
                }
              });
              var descriptor = {
                foo: {
                  writtable: true,
                  configurable: true,
                  enumerable: true,
                  value: ${VALUE}
                }
              };
              var descProxy = new Proxy(descriptor, {
                get: function(target, property) {
                  var desc = target[property];
                  return {
                    writtable: desc.writtable,
                    configurable: desc.configurable,
                    enumerable: desc.enumerable,
                    value: desc.value + ${modifier}
                  };
                }
              });

              var newObject = Object.create(mainProxy, descProxy);

              newObject.a + newObject.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal((VALUE * modifier) + (VALUE + modifier));
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const fooValue = randomNumber();
            const code = `
              var mainObject = { a: ${VALUE} };
              var descriptor = {
                foo: {
                  writtable: true,
                  configurable: true,
                  enumerable: true,
                  value: ${fooValue}
                }
              };

              var newObject = Object.create(mainObject, descriptor);

              newObject.a + newObject.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE + fooValue);
          });
        });
      });

      context('Object.defineProperties', () => {
        context('with proxy', () => {
          it('should add properties to target', () => {
            const multiplier = 4;
            const code = `
              var target = { value: ${VALUE} };
              var proxy = new Proxy(target, {});
              Object.defineProperties(proxy, {
                v: {
                  enumerable: true,
                  get: function() { return this; }
                },
                vv: {
                  enumerable: true,
                  get: function() { return ${multiplier}; }
                }
              });

              (proxy.v.value * proxy.vv) == (target.v.value * target.vv) && (proxy.v.value * proxy.vv) == (${VALUE} * ${multiplier});
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should add properties to target', () => {
            const multiplier = 4;
            const code = `
              var target = { value: ${VALUE} };
              Object.defineProperties(target, {
                v: {
                  enumerable: true,
                  get: function() { return this; }
                },
                vv: {
                  enumerable: true,
                  get: function() { return ${multiplier}; }
                }
              });

              (target.v.value * target.vv) == (${VALUE} * ${multiplier});
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });

      context('Object.defineProperty', () => {
        context('with proxies', () => {
          it('should add property to target', () => {
            const code = `
              var target = {};
              var proxy = new Proxy(target, {});
              Object.defineProperty(proxy, 'metaine', {
                enumerable: true,
                get() {
                  return ${VALUE};
                }
              });

              target.metaine;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should bind this to the right this', () => {
            const code = `
              var target = { metaine: ${VALUE} };
              var proxy = new Proxy(target, {});
              Object.defineProperty(proxy, 'self', {
                enumerable: true,
                get() {
                  return this;
                }
              });
              var proxy2 = new Proxy(proxy, {});

              proxy.self === proxy && target.self === target && proxy2.self === proxy2;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxies', () => {
          it('should work', () => {
            const multiplier = 3;
            const code = `
              var obj = { multiplier: ${multiplier} };
              Object.defineProperty(obj, 'value', {
                enumerable: true,
                get: function() {
                  return this.multiplier * ${VALUE};
                }
              });

              obj.value;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE * multiplier);
          });
        });
      });

      context('Object.freeze', () => {
        context('with proxy', () => {
          it('should freeze the target', () => {
            const code = `
              var obj = {};
              var proxy = new Proxy(obj, {});
              Object.freeze(proxy);

              obj.value = ${VALUE};
              obj.value;
            `;

            const output = buildRun(code);

            expect(output).to.be.undefined;
          });
        });

        context('without proxy', () => {
          it('should freeze the target', () => {
            const code = `
              var obj = {};
              Object.freeze(obj);

              obj.value = ${VALUE};
              obj.value;
            `;

            const output = buildRun(code);

            expect(output).to.be.undefined;
          });
        });
      });

      context('Object.getOwnPropertyDescriptor', () => {
        context('with proxy', () => {
          it('should return target descriptor', () => {
            const code = `
              var target = { value: ${VALUE} };
              var proxy = new Proxy(target, {});
              Object.getOwnPropertyDescriptor(proxy, 'value');
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal({
              value: VALUE,
              enumerable: true,
              configurable: true,
              writable: true,
            });
          });
        });

        context('without proxy', () => {
          it('should return target descriptor', () => {
            const code = `
              var target = { value: ${VALUE} };
              Object.getOwnPropertyDescriptor(target, 'value');
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal({
              value: VALUE,
              enumerable: true,
              configurable: true,
              writable: true,
            });
          });
        });
      });

      context('Object.getOwnPropertyNames', () => {
        context('with proxy', () => {
          it('should return Object.getOwnPropertyNames(target)', () => {
            const otherValue = randomNumber();
            const code = `
              var obj = { value: ${VALUE} };
              Object.defineProperty(obj, 'other', {
                enumerable: true,
                writable: true,
                configurable: true,
                value: ${otherValue}
              });

              var proxy = new Proxy(obj, {});

              Object.getOwnPropertyNames(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['value', 'other']);
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const otherValue = randomNumber();
            const code = `
              var obj = { value: ${VALUE} };
              Object.defineProperty(obj, 'other', {
                enumerable: true,
                writable: true,
                configurable: true,
                value: ${otherValue}
              });

              Object.getOwnPropertyNames(obj);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['value', 'other']);
          });
        });
      });

      context('Object.getPrototypeOf', () => {
        context('with proxy', () => {
          it('should return Object.getOwnPropertyNames(target)', () => {
            const otherValue = randomNumber();
            const code = `
              var obj = { value: ${VALUE} };
              Object.defineProperty(obj, 'other', {
                enumerable: true,
                writable: true,
                configurable: true,
                value: ${otherValue}
              });

              var proxy = new Proxy(obj, {});

              Object.getOwnPropertyNames(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['value', 'other']);
          });
        });

        context('without proxy', () => {
          it('should return Object.getOwnPropertyNames(target)', () => {
            const otherValue = randomNumber();
            const code = `
              var obj = { value: ${VALUE} };
              Object.defineProperty(obj, 'other', {
                enumerable: true,
                writable: true,
                configurable: true,
                value: ${otherValue}
              });

              var proxy = new Proxy(obj, {});

              Object.getOwnPropertyNames(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['value', 'other']);
          });
        });
      });

      context('Object.isExtensible', () => {
        context('with proxy', () => {
          context('when not extensible', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.freeze(proxy);
                Object.isExtensible(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });

          context('when extensible', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.isExtensible(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });
        });

        context('without proxy', () => {
          context('when not extensible', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                Object.freeze(obj);
                Object.isExtensible(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });

          context('when extensible', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                Object.isExtensible(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });
        });
      });

      context('Object.isFrozen', () => {
        context('with proxy', () => {
          context('when not frozen', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.freeze(proxy);
                Object.isFrozen(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when frozen', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.isFrozen(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when not frozen', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                Object.freeze(obj);
                Object.isFrozen(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when frozen', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                Object.isFrozen(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });

      context('Object.isSealed', () => {
        context('with proxy', () => {
          context('when not sealed', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.freeze(proxy);
                Object.isSealed(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when sealed', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                var proxy = new Proxy(obj, {});
                Object.isSealed(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when not sealed', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                Object.freeze(obj);
                Object.isSealed(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when sealed', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                Object.isSealed(obj);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });

      context('Object.keys', () => {
        context('with proxy', () => {
          it('should return target keys', () => {
            const code = `
              var obj = { aKey: 'aValue' };
              var proxy = new Proxy(obj, {});
              Object.keys(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['aKey']);
          });
        });

        context('without proxy', () => {
          it('should return target keys', () => {
            const code = `
              var obj = { aKey: 'aValue' };
              Object.keys(obj);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['aKey']);
          });
        });
      });

      context('Object.preventExtensions', () => {
        context('with proxy', () => {
          it('should apply on target', () => {
            const code = `
              var obj = { a: 'a' };
              var proxy = new Proxy(obj, {});
              Object.preventExtensions(proxy);
              obj.b = 5;
              obj.b;
            `;

            const output = buildRun(code);

            expect(output).to.be.undefined;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = { a: 'a' };
              Object.preventExtensions(obj);
              obj.b = 5;
              obj.b;
            `;

            const output = buildRun(code);

            expect(output).to.be.undefined;
          });
        });
      });

      context('Object.seal', () => {
        context('with proxy', () => {
          it('should seal the target', () => {
            const code = `
              var obj = { a: ${VALUE} };
              var proxy = new Proxy(obj, {});
              Object.seal(proxy);

              delete obj.a;
              obj.a;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('without proxy', () => {
          it('should seal the obj', () => {
            const code = `
              var obj = { a: ${VALUE} };
              Object.seal(obj);

              delete obj.a;
              obj.a;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('Object.setPrototypeOf', () => {
        context('with proxy', () => {
          it('should set prototype to target', () => {
            const code = `
              var obj = { a: ${VALUE} };
              var proxy = new Proxy(obj, {});
              var prototype = {};
              Object.setPrototypeOf(proxy, prototype);

              obj.__proto__ === prototype;
            `;

            const output = build(code).code;

            expect(() => {
              eval(output); //eslint-disable-line no-eval
            }).to.throw('[babel-plugin-es5-proxy] \'Object.setPrototypeOf\' not implemented with proxy as arguments');
          });
        });

        context('without proxy', () => {
          it('should set prototype to obj', () => {
            const code = `
              var obj = { a: ${VALUE} };
              var prototype = {};
              Object.setPrototypeOf(obj, prototype);

              obj.__proto__ === prototype;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });
    });

    context('Object.prototype', () => {
      context('Object.prototype.hasOwnProperty', () => {
        context('with proxy', () => {
          context('when object has property', () => {
            it('should return true', () => {
              const code = `
                var obj = { a: ${VALUE} };
                var proxy = new Proxy(obj, {});
                proxy.hasOwnProperty('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when object does not have property', () => {
            it('should return false', () => {
              const code = `
                var obj = { a: ${VALUE} };
                var proxy = new Proxy(obj, {});
                proxy.hasOwnProperty('b');
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });

            context('when a trap is set for getOwnPropertyDescriptor', () => {

            });
          });
        });

        context('without proxy', () => {
          context('when object has property', () => {
            it('should return true', () => {
              const code = `
                var obj = { a: ${VALUE} };
                obj.hasOwnProperty('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when object does not have property', () => {
            it('should return false', () => {
              const code = `
                var obj = { a: ${VALUE} };
                obj.hasOwnProperty('b');
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });

      context('Object.prototype.propertyIsEnumerable', () => {
        context('with proxy', () => {
          context('when is enumerable', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                Object.defineProperty(obj, 'a', {
                  enumerable: true
                });
                var proxy = new Proxy(obj, {});
                proxy.propertyIsEnumerable('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when is not enumerable', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                Object.defineProperty(obj, 'a', {
                  enumerable: false
                });
                var proxy = new Proxy(obj, {});
                proxy.propertyIsEnumerable('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when is enumerable', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                Object.defineProperty(obj, 'a', {
                  enumerable: true
                });
                obj.propertyIsEnumerable('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when is not enumerable', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                Object.defineProperty(obj, 'a', {
                  enumerable: false
                });
                obj.propertyIsEnumerable('a');
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });

      context('Object.prototype.isPrototypeOf', () => {
        context('with proxy', () => {
          context('when is prototype of', () => {
            context('when obj is proxy', () => {
              it('should return false', () => {
                const code = `
                  var obj = {};
                  var newObject = Object.create(obj);
                  (new Proxy(obj, {})).isPrototypeOf(newObject);
                `;

                const output = buildRun(code);

                expect(output).to.be.false;
              });
            });

            context('when argument is proxy', () => {
              it('should return true', () => {
                const code = `
                  var obj = {};
                  var newObject = Object.create(obj);
                  obj.isPrototypeOf(new Proxy(newObject, {}));
                `;

                const output = buildRun(code);

                expect(output).to.be.true;
              });
            });
          });

          context('when is not prototype of', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                var newObject = Object.create({});
                obj.isPrototypeOf(newObject);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when is prototype of', () => {
            it('should return true', () => {
              const code = `
                var obj = {};
                var newObject = Object.create(obj);
                obj.isPrototypeOf(newObject);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when is not prototype of', () => {
            it('should return false', () => {
              const code = `
                var obj = {};
                var newObject = Object.create({});
                obj.isPrototypeOf(newObject);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });

      context('Object.prototype.toLocaleString', () => {
        context('with proxy', () => {
          it('should return target.toLocaleString', () => {
            const code = `
              var obj = [];
              var proxy = new Proxy(obj, {});
              Object.prototype.toLocaleString.call(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.equal('');
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = { a: ${VALUE} };
              obj.toLocaleString();
            `;

            const output = buildRun(code);

            expect(output).to.equal('[object Object]');
          });
        });
      });

      context('Object.prototype.toString', () => {
        context('with proxy', () => {
          it('should return target.toString', () => {
            const code = `
              var obj = [];
              var proxy = new Proxy(obj, {});
              Object.prototype.toString.call(proxy);
            `;

            const output = buildRun(code);

            expect(output).to.equal('[object Array]');
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = { a: ${VALUE} };
              obj.toString();
            `;

            const output = buildRun(code);

            expect(output).to.equal('[object Object]');
          });
        });
      });

      context('Object.prototype.__defineGetter__', () => {
        context('with proxy', () => {
          it('should define on target', () => {
            const code = `
              var obj = {};
              var proxy = new Proxy(obj, {});
              Object.prototype.__defineGetter__.call(proxy, 'a', function() { return ${VALUE}; });
              obj.a;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = {};
              Object.prototype.__defineGetter__.call(obj, 'a', function() { return ${VALUE}; });
              obj.a;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('Object.prototype.__defineSetter__', () => {
        context('with proxy', () => {
          it('should define on target', () => {
            const code = `
              var obj = {};
              var proxy = new Proxy(obj, {});
              var mem = 4;
              Object.prototype.__defineSetter__.call(proxy, 'a', function() { mem = ${VALUE}; return true; });
              obj.a = 3;
              mem;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = {};
              var mem = 4;
              Object.prototype.__defineSetter__.call(obj, 'a', function() { mem = ${VALUE}; return true; });
              obj.a = 3;
              mem;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('Object.prototype.__lookupGetter__', () => {
        context('with proxy', () => {
          it('should define on target', () => {
            const code = `
              var obj = {};
              var proxy = new Proxy(obj, {});
              var mem = 4;
              var fn = function() { return ${VALUE}; };
              Object.prototype.__defineGetter__.call(obj, 'a', fn);
              Object.prototype.__lookupGetter__.call(proxy, 'a') === fn;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = {};
              var mem = 4;
              var fn = function() { return ${VALUE}; };
              Object.prototype.__defineGetter__.call(obj, 'a', fn);
              Object.prototype.__lookupGetter__.call(obj, 'a') === fn;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });

      context('Object.prototype.__lookupSetter__', () => {
        context('with proxy', () => {
          it('should define on target', () => {
            const code = `
              var obj = {};
              var proxy = new Proxy(obj, {});
              var mem = 4;
              var fn = function() { return true; };
              Object.prototype.__defineSetter__.call(obj, 'a', fn);
              Object.prototype.__lookupSetter__.call(proxy, 'a') === fn;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = {};
              var mem = 4;
              var fn = function() { return true; };
              Object.prototype.__defineSetter__.call(obj, 'a', fn);
              Object.prototype.__lookupSetter__.call(obj, 'a') === fn;
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });
    });

    context('Array', () => {
      context('Array.isArray', () => {
        context('with proxy', () => {
          context('when target is array', () => {
            it('should return true', () => {
              const code = `
                var proxy = new Proxy([], {});
                Array.isArray(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when target is not array', () => {
            it('should return false', () => {
              const code = `
                var proxy = new Proxy({}, {});
                Array.isArray(proxy);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when is array', () => {
            it('should return true', () => {
              const code = `
                Array.isArray([]);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when is not array', () => {
            it('should return false', () => {
              const code = `
                Array.isArray({});
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });
    });

    context('Array.prototype', () => {
      context('Array.prototype.push', () => {
        context('with proxy', () => {
          it('should use target', () => {
            const code = `
              var obj = [];
              var proxy = new Proxy(obj, {});

              Array.prototype.push.call(proxy, ${VALUE});

              obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([VALUE]);
          });
        });

        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var obj = [];

              Array.prototype.push.call(obj, ${VALUE});

              obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([VALUE]);
          });
        });
      });

      context('Array.prototype.concat', () => {
        context('with proxy', () => {
          context('when this is a proxy', () => {
            it('should use target', () => {
              const code = `
                var obj = ['no'];
                var proxy = new Proxy(obj, {
                  get: function(target, prop) {
                    if (prop == '0') {
                      return ${VALUE};
                    }

                    return target[prop];
                  }
                });

                Array.prototype.concat.call(proxy, [${VALUE}]);
              `;

              const output = buildRun(code);

              expect(output).to.deep.equal([VALUE, VALUE]);
            });
          });

          context('when param is proxy', () => {
            it('should work', () => {
              const code = `
                var obj = [];

                var other = [-5]
                var proxy = new Proxy(other, {
                  get: function(t, p) {
                    if (p == '0') return ${VALUE};

                    return t[p];
                  }
                });

                Array.prototype.concat.call(obj, proxy);
              `;

              const output = buildRun(code);

              expect(output).to.deep.equal([VALUE]);
            });
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = [];

              Array.prototype.concat.call(obj, [${VALUE}]);
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([VALUE]);
          });
        });
      });

      context('Array.prototype.join', () => {
        context('with proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const MULTIPLIER = 3;
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (!isNaN(parseInt(p))) {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });

              Array.prototype.join.call(proxy, ', ');
            `;

            const output = buildRun(code);

            expect(output).to.equal(`${VALUE * MULTIPLIER}, ${OTHER * MULTIPLIER}`);
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              Array.prototype.join.call(obj, ', ');
            `;

            const output = buildRun(code);

            expect(output).to.equal(`${VALUE}, ${OTHER}`);
          });
        });
      });

      context('Array.prototype.pop', () => {
        context('with proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const MULTIPLIER = 3;
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (!isNaN(parseInt(p))) {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });
              Array.prototype.pop.call(proxy) === ${OTHER} * ${MULTIPLIER} && obj.length === 1
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              Array.prototype.pop.call(obj) === ${OTHER} && obj.length === 1
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });

      context('Array.prototype.reverse', () => {
        context('with proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const MULTIPLIER = 3;
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (!isNaN(parseInt(p.toString()))) {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });
              var callValue = Array.prototype.reverse.call(proxy);
              callValue === proxy && obj.length === 2 && obj[0] === ${OTHER} * ${MULTIPLIER}
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              obj.reverse();
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([OTHER, VALUE]);
          });
        });
      });

      context('Array.prototype.shift', () => {
        context('with proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const MULTIPLIER = 3;
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (!isNaN(parseInt(p))) {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });
              Array.prototype.shift.call(proxy) === ${VALUE} * ${MULTIPLIER} && obj.length === 1
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const OTHER = randomNumber();
            const code = `
              var obj = [${VALUE}, ${OTHER}];
              Array.prototype.shift.call(obj) === ${VALUE} && obj.length === 1
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });

      context('Array.prototype.slice', () => {
        context('with proxy', () => {
          it('should work', () => {
            const FIRST = randomNumber();
            const SECOND = randomNumber();
            const THIRD = randomNumber();
            const FOURTH = randomNumber();
            const MULTIPLIER = 3;
            const code = `
              var obj = [${FIRST}, ${SECOND}, ${THIRD}, ${FOURTH}];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (!isNaN(parseInt(p))) {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });
              var value = Array.prototype.slice.call(proxy, 1, 3);
              value.length === 2 && value[0] === ${SECOND * MULTIPLIER} && value[1] === ${THIRD * MULTIPLIER};
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const FIRST = randomNumber();
            const SECOND = randomNumber();
            const THIRD = randomNumber();
            const FOURTH = randomNumber();
            const code = `
              var obj = [${FIRST}, ${SECOND}, ${THIRD}, ${FOURTH}];
              var value = Array.prototype.slice.call(obj, 1, 3);
              value.length === 2 && value[0] === ${SECOND} && value[1] === ${THIRD};
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });
      });

      context('Array.prototype.sort', () => {
        context('with proxy', () => {
          xit('should work', () => {
            const MULTIPLIER = 3;
            const code = `
              var obj = [3,2,1,4,5];
              var proxy = new Proxy(obj, {
                get(t, p) {
                  var value = t[p];
                  if (p == '1') {
                    value = value * ${MULTIPLIER};
                  }
                  return value;
                }
              });
              var value = Array.prototype.sort.call(proxy);
              value === proxy && obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([1, 3, 4, 5, 6]); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var obj = [3,2,1,4,5];
              var value = Array.prototype.sort.call(obj);
              value === obj && obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([1, 2, 3, 4, 5]); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.splice', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var months = ['Jan', 'March', 'April', 'June'];
              var proxy = new Proxy(months, {
                get: function(t, p) {
                  var value = t[p];
                  if (p !== 'length' && p !== 'constructor') {
                    value = value + ' getted'
                  }
                  return value;
                },

                set: function(t, p, v) {
                  t[p] = v;

                  if (p !== 'length') {
                    t[p] = v + ' setted';
                  } else {
                    t[p] = v;
                  }

                  return true;
                }
              });
              Array.prototype.splice.call(proxy, 1, 0, 'Feb');
              Array.prototype.splice.call(proxy, 4, 1, 'May');

              months;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['Jan', 'Feb setted', 'March getted setted', 'April getted setted', 'May setted']);
          });

          context('when start is negative', () => {
            it('should work', () => {

            });
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var months = ['Jan', 'March', 'April', 'June'];
              months.splice(1, 0, 'Feb');
              months.splice(4, 1, 'May');
              months;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal(['Jan', 'Feb', 'March', 'April', 'May']);
          });
        });
      });

      context('Array.prototype.toLocaleString', () => {
        it('should be written', () => {
          expect(true).to.be.false;
        });
      });

      context('Array.prototype.toString', () => {
        it('should be written', () => {
          expect(true).to.be.false;
        });
      });

      context('Array.prototype.unshift', () => {
        context('with proxy', () => {
          it('should use target', () => {
            const code = `
              var obj = [];
              var proxy = new Proxy(obj, {});

              Array.prototype.unshift.call(proxy, ${VALUE});

              obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([VALUE]);
          });
        });

        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var obj = [];

              Array.prototype.unshift.call(obj, ${VALUE});

              obj;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([VALUE]);
          });
        });
      });

      context('Array.prototype.indexOf', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 2, 3, 4, 1];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length' || property === 'constructor') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.indexOf.call(proxy, function (val) { return val === 2})
            `;

            const output = buildRun(code);

            expect(output).to.equal(0); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 2, 3, 4, 1];
              Array.prototype.indexOf.call(array, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(0); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.every', () => {
        context('with proxy', () => {
          context('when the array contains only truthy values', () => {
            it('should return true', () => {
              const code = `
                var arr = [3, 3, 3, 3];
                var proxy = new Proxy(arr, { get(target, property) {
                  if (property === 'length') return target[property];
                  return target[property] + 1;
                } });
                Array.prototype.every.call(proxy, (elem) => elem === 4);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when the array contains a falsey value', () => {
            it('should return false', () => {
              const code = `
                var arr = [3, 3, 3, false];
                var proxy = new Proxy(arr, { get(target, property) {
                  if (property === 'length') return target[property];
                  return target[property] + 1;
                } });
                Array.prototype.every.call(proxy, (elem) => elem === 3);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });

          context('without proxy', () => {
            context('when the array contains only truthy value', () => {
              it('should return true', () => {
                const code = `
                var arr = [3, 3, 3, 3];
                Array.prototype.every.call(arr, (elem) => elem === 3);
              `;

                const output = buildRun(code);

                expect(output).to.be.true;
              });
            });

            context('when the array contains a falsey value', () => {
              it('should return false', () => {
                const code = `
                var arr = [3, false, 3, 3];
                Array.prototype.every.call(arr, (elem) => elem === 3);
              `;

                const output = buildRun(code);

                expect(output).to.be.false;
              });
            });
          });
        });
      });

      context('Array.prototype.filter', () => {
        it('should be written', () => {
          expect(true).to.be.false;
        });
      });

      context('Array.prototype.forEach', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var rtn = [];
              var that = new Proxy({multiplier: 1}, { get(target, property) { return target[property] * 2; }});
              var array = [
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
              ];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length' || property === 'constructor') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.forEach.call(proxy, function (val) { rtn.push(val.value * this.multiplier); }, that)
              rtn;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([12, 12, 12, 12, 12]); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var rtn = [];
              var array = [1, 1, 1, 1, 1];
              array.forEach(function(val) { rtn.push(val * this.multiplier) }, { multiplier: 2 })
              rtn;
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([2, 2, 2, 2, 2]); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.lastIndexOf', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 2, 3, 4, 1];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length' || property === 'constructor') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.lastIndexOf.call(proxy, function (val) { return val === 2})
            `;

            const output = buildRun(code);

            expect(output).to.equal(4); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 2, 3, 4, 1];
              Array.prototype.lastIndexOf.call(array, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(4); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.map', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var that = new Proxy({multiplier: 1}, { get(target, property) { return target[property] * 2; }});
              var array = [
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
              ];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length' || property === 'constructor') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.map.call(proxy, function (val) { return this.multiplier * val.value }, that)
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([12, 12, 12, 12, 12]); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 1, 1, 1, 1];
              array.map(function(val) { return val * this.multiplier; }, { multiplier: 2 })
            `;

            const output = buildRun(code);

            expect(output).to.deep.equal([2, 2, 2, 2, 2]); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.reduce', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var array = [
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
              ];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.reduce.call(proxy, (acc, val) => acc + val.value, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(31); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 1, 1, 1, 1];
              array.reduce((acc, val) => acc + val, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(6); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.reduceRight', () => {
        context('with proxy', () => {
          it('should work', () => {
            const code = `
              var array = [
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
                new Proxy({ value: 1 }, { get(target, property) { if (property === 'value') return target[property] * 2; return target[property]; } }),
              ];
              var proxy = new Proxy(array, { get(target, property) {
                if (property === 'length') return target[property];
                target[property].value += 1;
                return target[property];
              }})
              Array.prototype.reduceRight.call(proxy, (acc, val) => acc + val.value, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(31); // eslint-disable-line no-magic-numbers
          });
        });

        context('without proxy', () => {
          it('should work', () => {
            const code = `
              var array = [1, 1, 1, 1, 1];
              array.reduceRight((acc, val) => acc + val, 1)
            `;

            const output = buildRun(code);

            expect(output).to.equal(6); // eslint-disable-line no-magic-numbers
          });
        });
      });

      context('Array.prototype.some', () => {
        context('with proxy', () => {
          context('when the array contains a truthy value', () => {
            it('should return true', () => {
              const code = `
                var arr = [false, false, 3, false];
                var proxy = new Proxy(arr, { get(target, property) {
                  if (property === 'length') return target[property];
                  return target[property] + 1;
                } });
                Array.prototype.some.call(proxy, (elem) => elem === 4);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when the array does not contain a truthy value', () => {
            it('should return false', () => {
              const code = `
                var arr = [false, false, 3, false];
                var proxy = new Proxy(arr, { get(target, property) {
                  if (property === 'length') return target[property];
                  return target[property] + 1;
                } });
                Array.prototype.some.call(proxy, (elem) => elem === 3);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });

        context('without proxy', () => {
          context('when the array contains a truthy value', () => {
            it('should return true', () => {
              const code = `
                var arr = [false, false, 3, false];
                Array.prototype.some.call(arr, (elem) => elem === 3);
              `;

              const output = buildRun(code);

              expect(output).to.be.true;
            });
          });

          context('when the array does not contain a truthy value', () => {
            it('should return false', () => {
              const code = `
                var arr = [false, false, 3, false];
                Array.prototype.some.call(arr, (elem) => elem === 2);
              `;

              const output = buildRun(code);

              expect(output).to.be.false;
            });
          });
        });
      });
    });
  });

  describe('mew mew stuff faster mew', () => {
    it('should pew fast', () => {
      const code = `
        function mul3(value) {
          return value * 3;
        }

        function mul6(value) {
          return mul3(value) * 2;
        }

        var aStart = new Date();

        var obj = {
          mul3: mul3,
          mul6: mul6
        };

        var data = [];
        for(var i =0; i<=10000; i++) {
          data.push(obj.mul6(i));
        }

        var aEnd = new Date();

        console.log(aEnd - aStart);
      `;

      buildRun(code);
    });

    // it('no no', () => {
    //   const code = `
    //     var obj = { id: ${VALUE} };
    //     var proxy = new Proxy(obj, {
    //       get(target, property) {
    //         return ${VALUE} + 1;
    //       }
    //     });

    //     var items = [];
    //     items.push(proxy);

    //     items[0].id
    //   `;

    //   const output = buildRun(code, true);

    //   expect(output).to.equal(VALUE);
    // });
  });

  describe('labeled Statement', () => {
    context('when using a labeled continue', () => {
      it('continue the right loop', () => {
        const code = `
          var index = 0;
          function nbr() { return ${VALUE}; }
          var stuff = { nbr: nbr };
          mew:
          for(var i = 0; i < stuff.nbr() * 2; i++) {
            index++;
            continue mew;
          }
          index - 1;
        `;

        const output = buildRun(code);

        expect(output).to.equal(Math.round(VALUE));
      });
    });
  });

  describe('JSON strignify', () => {
    context('when stringifying an object', () => {
      it('should stringify the object', () => {
        const code = `
          let obj = { foo: 'bar' };
          JSON.stringify(obj)
        `;
        const output = buildRun(code);

        expect(output).to.equal('{"foo":"bar"}');
      });
    });

    context('when stringifying a proxy', () => {
      it('should stringify the target', () => {
        const code = `
          let obj = new Proxy({foo: 'bar'}, {});
          JSON.stringify(obj)
        `;
        const output = buildRun(code);

        expect(output).to.equal('{"foo":"bar"}');
      });
    });
  });

  describe('when target is an array', () => {
    context('when using a proxy', () => {
      context('when calling map on the array', () => {
        it('should call map on the target', () => {
          const code = `
            const proxy = new Proxy([${VALUE}], {});
            proxy.map((item) => item);
          `;

          const output = buildRun(code);

          expect(output[0]).to.equal(VALUE);
        });
      });

      context('when calling map with Array.prototype.map', () => {
        it('should call map on the target', () => {
          const code = `
            const proxy = new Proxy([${VALUE}], {});
            Array.prototype.map.call(proxy, (item) => item);
          `;

          const output = buildRun(code);

          expect(output[0]).to.equal(VALUE);
        });
      });

      // context.only('when using a for of', () => {
      //   const code = `
      //     const proxy = new Proxy([${VALUE}], {});
      //     for (let item of proxy) item
      //   `;

      //   const output = buildRun(code);

      //   expect(output).to.equal(VALUE);
      // });

      // context('when using a for in', () => {
      //   const code = `
      //     const proxy = new Proxy([${VALUE}], {});
      //     for (let key in proxy) proxy[key]
      //   `;

      //   const output = buildRun(code);

      //   expect(output).to.equal(VALUE);
      // });
    });
  });

  describe('regular assignment', () => {
    context('when assigning a literal to a variable', () => {
      it('should return the value', () => {
        const code = `
          let obj;
          obj = ${VALUE};
          obj;
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });
    });
  });

  describe('inception', () => {
    context('when a proxy is in a proxy', () => {
      context('when accessing a property', () => {
        it('should call the getter in the inner proxy', () => {
          const code = `
            const inner = new Proxy({}, { get(object) { return ${VALUE}; } })
            const obj = new Proxy(inner, {});
            obj.foo;
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });
      });

      context('when setting a property', () => {
        it('should call the setter in the inner proxy', () => {
          const code = `
            const inner = new Proxy({}, { set(object) { object.foo = ${VALUE}; } })
            const obj = new Proxy(inner, {});
            obj.bar = 5;
            obj.foo
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });
      });
    });
  });

  describe('eval', () => {
    it('should declare function from runtime only once', () => {
      const code = `eval("var foo = ${VALUE};")`;
      const output = build(code).code;

      const regex = /function\s__\$global_getter\$__/g;
      const matching = output.match(regex);

      expect(matching.length).to.equal(1);
    });

    context('when calling eval in eval', () => {
      it('should return the value of the eval', () => {
        const code = `
          eval("eval('var obj = { bar: ${VALUE} }; obj.bar;')")
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });

      it('should transpile the code in the eval recursively', () => {
        const code = `eval("eval('var obj = { bar: ${VALUE} }; obj.bar;')")`;

        const output = build(code).code;

        expect(output).to.include('global_getter');
      });

      it('should have access to the local scope', () => {
        const code = `
          function foo(bar) {
            return eval('bar');
          }
          foo(${VALUE});
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });

      context('when using es6 syntax', () => {
        it('should not import core-js', () => {
          const code = `eval("var obj = { bar: ${VALUE} }; typeof obj.bar;")`;
          const output = build(code).code;

          expect(output).to.include('function _typeof');
          expect(output).to.not.include('core-js');
          expect(output).to.not.include('runtime-corejs2');
        });
      });
    });
  });

  context('when using a regular object', () => {
    describe('assignmentExpression', () => {
      describe('+=', () => {
        context('when incrementing by 1', () => {
          it('should add 1 to the property', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo += 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE + 1);
          });

          it('should return the property plus 1', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo += 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE + 1);
          });
        });
      });

      describe('-=', () => {
        context('when decrementing by 1', () => {
          it('should remove 1 to the property', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo -= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE - 1);
          });

          it('should return the property minus 1', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo -= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE - 1);
          });
        });
      });

      describe('*=', () => {
        context('when multiplying by 2', () => {
          it('should multiply the property by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo *= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE * n);
          });

          it('should return the property multiplied by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo *= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE * n);
          });
        });
      });

      describe('/=', () => {
        context('when dividing by 2', () => {
          it('should divide the property by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo /= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE / n);
          });

          it('should return the property divided by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo /= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE / n);
          });
        });
      });

      describe('%=', () => {
        context('when modulusing by 2', () => {
          it('should modulus the property by 2', () => {
            const n = 2;
            const multiplier = 10;
            const NEW_VALUE = VALUE * multiplier;

            const code = `
              const obj = { foo: ${NEW_VALUE} };
              obj.foo %= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(NEW_VALUE % n);
          });

          it('should return the property modulus 2', () => {
            const n = 2;
            const multiplier = 10;
            const NEW_VALUE = VALUE * multiplier;
            const code = `
              const obj = { foo: ${NEW_VALUE} };
              obj.foo %= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(NEW_VALUE % n);
          });
        });
      });

      describe('&=', () => {
        context('when 21 & 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 5', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo &= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 5', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo &= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('|=', () => {
        context('when 21 | 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 31', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo |= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 31', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo |= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('^=', () => {
        context('when 21 ^ 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 26', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo ^= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 26', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo ^= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('<<=', () => {
        context('when 20.5 << 1', () => {
          beforeEach(() => {
            VALUE = 20.5; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 40', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo <<= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE << 1); // eslint-disable-line no-bitwise
          });

          it('should return 40', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo <<= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE << 1); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('>>>=', () => {
        context('when -10 >>> 1', () => {
          beforeEach(() => {
            VALUE = -10; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 2147483643', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo >>>= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE >>> 1); // eslint-disable-line no-bitwise
          });

          it('should return 2147483643', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo >>>= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE >>> 1); // eslint-disable-line no-bitwise
          });
        });
      });
    });

    describe('updateExpression', () => {
      context('when incrementing an accessed property', () => {
        context('when postfix', () => {
          it('should increment the property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo++;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });

          it('should return the not incremented property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo++;
            `;

            const output = buildRun(code);

            expect(output).to.equal(0);
          });
        });

        context('when prefix', () => {
          it('should increment the property', () => {
            const code = `
              const obj = { foo: 0 };
              ++obj.foo;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });

          it('should return the incremented property', () => {
            const code = `
              const obj = { foo: 0 };
              ++obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });
        });
      });

      context('when decrementing an accessed property', () => {
        context('when postfix', () => {
          it('should decrement the property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo--;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });

          it('should return the not decremented property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo--;
            `;

            const output = buildRun(code);

            expect(output).to.equal(0);
          });
        });

        context('when prefix', () => {
          it('should decrement the property', () => {
            const code = `
              const obj = { foo: 0 };
              --obj.foo;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });

          it('should return the decremented property', () => {
            const code = `
              const obj = { foo: 0 };
              --obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });
        });
      });
    });
  });

  context('when using a proxy', () => {
    describe('comparison', () => {
      it('should not equal target', () => {
        const code = `
          var target = {};
          var proxy = new Proxy(target, {});
          target === proxy;
        `;

        const output = buildRun(code);

        expect(output).to.be.false;
      });
    });

    describe('assignmentExpression', () => {
      describe('+=', () => {
        context('when incrementing by 1', () => {
          it('should add 1 to the property', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo += 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE + 1);
          });

          it('should return the property plus 1', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo += 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE + 1);
          });
        });
      });

      describe('-=', () => {
        context('when decrementing by 1', () => {
          it('should remove 1 to the property', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo -= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE - 1);
          });

          it('should return the property minus 1', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo -= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE - 1);
          });
        });
      });

      describe('*=', () => {
        context('when multiplying by 2', () => {
          it('should multiply the property by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo *= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE * n);
          });

          it('should return the property multiplied by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo *= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE * n);
          });
        });
      });

      describe('/=', () => {
        context('when dividing by 2', () => {
          it('should divide the property by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo /= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE / n);
          });

          it('should return the property divided by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo /= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE / n);
          });
        });
      });

      describe('%=', () => {
        context('when modulusing by 2', () => {
          it('should modulus the property by 2', () => {
            const n = 2;
            const multiplier = 10;
            const NEW_VALUE = VALUE * multiplier;

            const code = `
              const obj = new Proxy({ foo: ${NEW_VALUE} }, {});
              obj.foo %= ${n};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(NEW_VALUE % n);
          });

          it('should return the property modulus 2', () => {
            const n = 2;
            const multiplier = 10;
            const NEW_VALUE = VALUE * multiplier;
            const code = `
              const obj = new Proxy({ foo: ${NEW_VALUE} }, {});
              obj.foo %= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.equal(NEW_VALUE % n);
          });
        });
      });

      describe('&=', () => {
        context('when 21 & 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 5', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo &= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 5', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo &= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('|=', () => {
        context('when 21 | 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 31', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo |= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 31', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo |= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('^=', () => {
        context('when 21 ^ 15', () => {
          let OTHER_VALUE;

          beforeEach(() => {
            VALUE = 21; // eslint-disable-line no-magic-numbers
            OTHER_VALUE = 15; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 26', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo ^= ${OTHER_VALUE};
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 26', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo ^= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('<<=', () => {
        context('when 20.5 << 1', () => {
          beforeEach(() => {
            VALUE = 20.5; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 40', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo <<= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE << 1); // eslint-disable-line no-bitwise
          });

          it('should return 40', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo <<= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE << 1); // eslint-disable-line no-bitwise
          });
        });
      });

      describe('>>>=', () => {
        context('when -10 >>> 1', () => {
          beforeEach(() => {
            VALUE = -10; // eslint-disable-line no-magic-numbers
          });

          it('should set the value to 2147483643', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo >>>= 1;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE >>> 1); // eslint-disable-line no-bitwise
          });

          it('should return 2147483643', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo >>>= 1;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE >>> 1); // eslint-disable-line no-bitwise
          });
        });
      });
    });

    describe('updateExpression', () => {
      context('when incrementing an accessed property', () => {
        context('when postfix', () => {
          it('should increment the property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo++;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });

          it('should return the not incremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo++;
            `;

            const output = buildRun(code);

            expect(output).to.equal(0);
          });
        });

        context('when prefix', () => {
          it('should increment the property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              ++obj.foo;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });

          it('should return the incremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              ++obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(1);
          });
        });
      });

      context('when decrementing an accessed property', () => {
        context('when postfix', () => {
          it('should decrement the property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo--;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });

          it('should return the not decremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo--;
            `;

            const output = buildRun(code);

            expect(output).to.equal(0);
          });
        });

        context('when prefix', () => {
          it('should decrement the property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              --obj.foo;
              obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });

          it('should return the decremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              --obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.equal(-1);
          });
        });
      });
    });
  });

  describe('globalDeleter', () => {
    context('when deleting on a regular object', () => {
      it('should remove the property', () => {
        const code = `
          const obj = { bar: ${VALUE} };
          delete obj.bar;
          obj.bar;
        `;

        const output = buildRun(code);

        expect(output).to.be.undefined;
      });

      it('should return true', () => {
        const code = `
          const obj = { bar: ${VALUE} };
          delete obj.bar;
        `;

        const output = buildRun(code);

        expect(output).to.be.true;
      });
    });

    context('when deleting on a proxy', () => {
      context('when no deleteProperty has been defined', () => {
        it('should remove the property', () => {
          const code = `
          const obj = new Proxy({ bar: ${VALUE} }, {});
          delete obj.bar;
          obj.bar;
        `;

          const output = buildRun(code);

          expect(output).to.be.undefined;
        });
      });

      it('should return true', () => {
        const code = `
          const obj = new Proxy({ bar: ${VALUE} }, {});
          delete obj.bar;
        `;

        const output = buildRun(code);

        expect(output).to.be.true;
      });
    });

    context('when a deleteProperty has been defined', () => {
      it('should call the deleteProperty function', () => {
        const code = `
          const obj = new Proxy({}, {
            deleteProperty(target, property) {
              target[property] = ${VALUE};
            }
          });
          delete obj.bar;
          obj.bar;
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });

      it('should return the return value of the deleteProperty function', () => {
        const code = `
          const obj = new Proxy({}, {
            deleteProperty(target, property) {
              return ${VALUE};
            }
          });
          delete obj.bar;
        `;

        const output = buildRun(code);

        expect(output).to.equal(true);
      });

      context('when the deleteProperty handler does nothing', () => {
        it('should not delete the property', () => {
          const code = `
            const obj = new Proxy({ bar: ${VALUE} }, {deleteProperty(target, property) {}});
            delete obj.bar;
            obj.bar
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });
      });
    });
  });

  describe('instanceof', () => {
    context('on a regular object', () => {
      it('should call apply instanceof to the target', () => {
        const code = `
          function Foo() {};
          var foo = new Foo();
          foo instanceof Foo;
        `;

        const output = buildRun(code);

        expect(output).to.be.true;
      });
    });

    context('on a proxy', () => {
      it('should call apply instanceof to the target', () => {
        const code = `
          function Foo() {};
          var foo = new Proxy(new Foo(), {});
          foo instanceof Foo;
        `;

        const output = buildRun(code);

        expect(output).to.be.true;
      });
    });
  });

  describe('globalHas', () => {
    context('when looking for a key in an object', () => {
      context('when the key is in the object', () => {
        it('should return true', () => {
          const code = `
            'foo' in { 'foo': true };
          `;

          const output = buildRun(code);

          expect(output).to.be.true;
        });
      });

      context('when the key is not in the object', () => {
        it('should return false', () => {
          const code = `
            'foo' in {};
          `;

          const output = buildRun(code);

          expect(output).to.be.false;
        });
      });
    });

    context('when looking for a key in a proxy', () => {
      context('when no handler has been defined', () => {
        context('when the key is in the proxy', () => {
          it('should return true', () => {
            const code = `
              'foo' in new Proxy({ 'foo': true }, {});
            `;

            const output = buildRun(code);

            expect(output).to.be.true;
          });
        });

        context('when the key is not in the proxy', () => {
          it('should return false', () => {
            const code = `
              'foo' in new Proxy({}, {});
            `;

            const output = buildRun(code);

            expect(output).to.be.false;
          });
        });
      });

      context('when a handler has been defined', () => {
        it('should use the handler and cast the value as boolean', () => {
          const code = `
            'foo' in new Proxy({}, {
              has() {
                return 3;
              },
            });
          `;

          const output = buildRun(code);

          expect(output).to.equal(true);
        });
      });
    });
  });

  describe('defineProperty', () => {
    context('when setting a property on a object', () => {
      it('should define the property', () => {
        const code = `
          const obj = {};
          Object.defineProperty(obj, 'foo', {
            get() {
              return ${VALUE};
            },
          });
          obj.foo;
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });
    });

    context('when setting a property on a proxy', () => {
      it('should define the property on the target', () => {
        const code = `
          const obj = new Proxy({},{});
          Object.defineProperty(obj, 'foo', {
            get() {
              return ${VALUE};
            },
          });
          obj.foo;
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });
    });
  });

  describe('enumerable', () => {
    describe('for in', () => {
      context('when looping on a object', () => {
        it('should loop over the object', () => {
          const code = `
            for (var a in { [${VALUE}]: true }) a
          `;

          const output = buildRun(code);

          expect(output).to.equal(`${VALUE}`);
        });
      });

      context('when looping on a proxy', () => {
        it('should loop over the target', () => {
          const code = `
            const foo = new Proxy({[${VALUE}]: true}, {})
            for (var a in foo) a
          `;

          const output = buildRun(code);

          expect(output).to.equal(`${VALUE}`);
        });
      });

      context('when looping on undefined', () => {
        it('should not fail', () => {
          const code = `
            for (var a in undefined) a
          `;

          const output = buildRun(code);

          expect(output).to.be.undefined;
        });
      });
    });

    describe('Object.keys', () => {
      context('when calling on an object', () => {
        it('should return object keys', () => {
          const code = `
            var obj = { a: 5, b: 3 };
            Object.keys(obj);
          `;

          const output = buildRun(code);

          expect(output).to.deep.equal(['a', 'b']);
        });
      });

      context('when calling on a proxy', () => {
        it('should target keys', () => {
          const code = `
            var obj = { a: 5, b: 3 };
            var proxy = new Proxy(obj, {});
            Object.keys(proxy);
          `;

          const output = buildRun(code);

          expect(output).to.deep.equal(['a', 'b']);
        });
      });
    });
  });

  describe('globalCaller', () => {
    it('should return the value', () => {
      const code = `
        const obj = { bar: function() { return ${VALUE}; } };
        obj.bar();
      `;

      const output = buildRun(code);

      expect(output).to.equal(VALUE);
    });

    it('should bind this to the right object', () => {
      const code = `
        const obj = { bar: function() { return this.baz; }, baz: ${VALUE} };
        obj.bar();
      `;

      const output = buildRun(code);

      expect(output).to.equal(VALUE);
    });

    describe('for statement', () => {
      it('should work', () => {
        const code = `
          var index = 0;
          function nbr() { return ${VALUE}; }
          var stuff = { nbr: nbr };
          var i = 0;
          for(stuff.nbr(); i < stuff.nbr() * 2; i++) {
            index++;
          }
          index - 1;
        `;

        const output = buildRun(code);

        expect(output).to.equal(Math.round(VALUE));
      });
    });

    context('when chaining function call', () => {
      it('should not call multiple time the same function on the chain', () => {
        const code = `
          var index = 0;
          function foo() { index++; return { bar: bar }; }
          function bar() { return { foo: foo }; }
          foo().bar();
          index;
        `;

        const output = buildRun(code);

        expect(output).to.equal(1);
      });

      context('using call', () => {
        it('should not call multiple time the same function on the chain', () => {
          const code = `
            var index = 0;
            function foo() { index++; return { bar: bar }; }
            function bar() { return { foo: foo }; }
            foo().bar.call();
            index;
          `;

          const output = buildRun(code);

          const numberOfCalledTime = 1;
          expect(output).to.equal(numberOfCalledTime);
        });
      });

      context('using call', () => {
        it('should not call multiple time the same function on the chain', () => {
          const code = `
            var index = 0;
            function foo() { index++; return { bar: bar }; }
            function bar() { return { foo: foo }; }
            foo().bar.apply();
            index;
          `;

          const output = buildRun(code);

          const numberOfCalledTime = 1;
          expect(output).to.equal(numberOfCalledTime);
        });
      });
    });

    context('when function is native', () => {
      context('when function is constructor', () => {
        context('when calling method on new constructor', () => {
          it('should return the value of the method', () => {
            const code = `
              Blob.toString = function() { return 'function Blob() { [native code] }'; };
              var wrapper = { meConstructor: Blob };
              Blob.prototype.pew = ${VALUE};
              new wrapper.meConstructor().pew;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should pass the arguments', () => {
            const code = `
              function Stuff(meArg) {
                if (!(this instanceof Stuff)) throw TypeError();
                this.pew = meArg;
              }
              Stuff.toString = function() { return 'function Stuff() { [native code] }'; };
              var wrapper = { meConstructor: Stuff };
              new wrapper.meConstructor(${VALUE}).pew;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('when raising an error', () => {
        it('should raise an error', () => {
          expect(() => {
            const code = `
              function wrongStuff() { throw 'No No'; }
              wrongStuff.toString = function() { return 'function wrongStuff() { [native code] }'; };
              var wrapper = { wrongStuff: wrongStuff };
              wrapper.wrongStuff();
            `;

            buildRun(code);
          }).to.throw('No No');
        });

        context('for missing new', () => {
          it('should raise an error', () => {
            expect(() => {
              const code = `
                function wrongStuff() { if (Object.keys(this).length) throw 'No No'; }
                wrongStuff.toString = function() { return 'function wrongStuff() { [native code] }'; };
                var wrapper = { wrongStuff: wrongStuff };
                wrapper.wrongStuff();
              `;

              buildRun(code);
            }).to.throw('No No');
          });
        });
      });

      context('when argument is a proxy', () => {
        context('when function is called directly', () => {
          it('should pass the proxy.target as argument', () => {
            const code = `
              var obj = { [${VALUE}]: 'foo' };
              var bar = Object.keys;
              var proxy = new Proxy(obj, {});
              bar(proxy);
            `;

            const [output] = buildRun(code);

            expect(output).to.deep.equal(VALUE.toString());
          });
        });
      });
    });

    context('when the function is in an array', () => {
      it('should call the function', () => {
        const code = `
            const obj = { bar: [function() { return ${VALUE}; }] };
            obj.bar[0]();
          `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
      });
    });
  });

  describe('globalGetter', () => {
    context('when accessing on regular object', () => {
      context('when property is not a function', () => {
        context('when property is top-level', () => {
          context('when property is accessed with period', () => {
            it('should return the value', () => {
              const code = `
                const obj = { bar: ${VALUE} };
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when property is accessed with brackets', () => {
            context('when property is a literal', () => {
              context('when property is a string', () => {
                it('should return the value', () => {
                  const code = `
                  const obj = { bar: ${VALUE} };
                  obj['bar'];
                `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when property is a number', () => {
                it('should return the value', () => {
                  const code = `
                    const obj = { 0: ${VALUE} };
                    obj[0];
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });
            });

            context('when property is a variable', () => {
              it('should return the value', () => {
                const code = `
                  const obj = { bar: ${VALUE} };
                  const baz = 'bar';
                  obj[baz];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when property is an arbitrary expression', () => {
              it('should return the value', () => {
                const code = `
                  const obj = { bar: ${VALUE} };
                  const r = 'r';
                  const a = { _: 'a' };
                  obj['b' + a._ + r];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when object is a function', () => {
              it('should return the value', () => {
                const code = `
                  const obj = { bar: ${VALUE} };
                  const baz = { boo: function() { return obj; } };
                  baz.boo()['bar'];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });

              context('when specifying a this', () => {
                context('with call', () => {
                  it('should return the value', () => {
                    const valueToAdd = Math.random();
                    const code = `
                      const thisObj = { stuff: ${VALUE} }
                      const baz = { stuff: 5, boo: function(vv) { return this.stuff + vv; } };
                      baz.boo.call(thisObj, ${valueToAdd});
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE + valueToAdd);
                  });
                });

                context('with apply', () => {
                  it('should return the value', () => {
                    const valueToAdd = Math.random();
                    const code = `
                      const thisObj = { stuff: ${VALUE} }
                      const baz = { stuff: 5, boo: function(vv) { return this.stuff + vv; } };
                      baz.boo.apply(thisObj, [${valueToAdd}]);
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE + valueToAdd);
                  });
                });

                context('with bind', () => {
                  it('should return the value', () => {
                    const valueToAdd = Math.random();
                    const code = `
                      const thisObj = { stuff: ${VALUE} }
                      const baz = { stuff: 5, boo: function(vv) { return this.stuff + vv; } };
                      baz.boo.bind(thisObj)(${valueToAdd});
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE + valueToAdd);
                  });
                });
              });
            });
          });
        });

        context('when property is two levels deep', () => {
          context('when accessing the first with a period', () => {
            context('when accessing the second with a period', () => {
              it('should return the value', () => {
                const code = `
                  const obj = { bar: { baz: ${VALUE} } };
                  obj.bar.baz
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when accessing the second with brackets', () => {
              context('when accessing the second with a literal', () => {
                it('should return the value', () => {
                  const code = `
                    const obj = { bar: { baz: ${VALUE} } };
                    obj.bar['baz']
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when accessing the second with a variable', () => {
                it('should return the value', () => {
                  const code = `
                    const obj = { bar: { baz: ${VALUE} } };
                    const boo = 'baz';
                    obj.bar[boo]
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });
            });
          });

          context('when accessing the first with brackets', () => {
            context('when accessing the second with a period', () => {
              context('when accessing the first with a literal', () => {
                it('should return the value', () => {
                  const code = `
                    const obj = { bar: { baz: ${VALUE} } };
                    obj['bar'].baz
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when accessing the first with a variable', () => {
                it('should return the value', () => {
                  const code = `
                    const obj = { bar: { baz: ${VALUE} } };
                    const boo = 'bar';
                    obj[boo].baz;
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });
            });

            context('when accessing the second with brackets', () => {
              context('when accessing the first with a literal', () => {
                context('when accessing the second with a literal', () => {
                  it('should return the value', () => {
                    const code = `
                      const obj = { bar: { baz: ${VALUE} } };
                      obj['bar']['baz'];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });

                context('when accessing the second with a variable', () => {
                  it('should return the value', () => {
                    const code = `
                      const obj = { bar: { baz: ${VALUE} } };
                      const boo = 'baz';
                      obj['bar'][boo];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });
              });

              context('when accessing the first with a variable', () => {
                context('when accessing the second with a literal', () => {
                  it('should return the value', () => {
                    const code = `
                      const obj = { bar: { baz: ${VALUE} } };
                      const far = 'bar';
                      obj[far]['baz'];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });

                context('when accessing the second with a variable', () => {
                  it('should return the value', () => {
                    const code = `
                      const obj = { bar: { baz: ${VALUE} } };
                      const far = 'bar';
                      const boo = 'baz';
                      obj[far][boo];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });
              });
            });
          });
        });
      });
    });

    context('when accessing on a proxy', () => {
      context('when no getter is defined', () => {
        context('when property is not a function', () => {
          context('when property is accessed with a period', () => {
            it('should return the value', () => {
              const code = `
                const obj = new Proxy({ bar: ${VALUE} }, {});
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when property is accessed with brackets', () => {
            context('when property is accessed with a literal', () => {
              it('should return the value', () => {
                const code = `
                  const obj = new Proxy({ bar: ${VALUE} }, {});
                  obj['bar'];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when property is accessed with a variable', () => {
              it('should return the value', () => {
                const code = `
                  const obj = new Proxy({ bar: ${VALUE} }, {});
                  const baz = 'bar';
                  obj[baz];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });
          });
        });

        context('when property is a function', () => {
          it('should return the value', () => {
            const code = `
              const obj = new Proxy({ bar: function() { return ${VALUE}; } }, {});
              obj.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should bind this to the right object', () => {
            const code = `
              const obj = new Proxy({ baz: ${VALUE}, bar: function() { return this.baz; } }, {});
              obj.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should pass arguments', () => {
            const code = `
              const obj = new Proxy({ baz: ${VALUE}, bar: function(property) { return this[property]; } }, {});
              obj.bar('baz');
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          context('when the function is in an array', () => {
            it('should call the function', () => {
              const code = `
                const obj = new Proxy({ bar: [function() { return ${VALUE}; }]}, {});
                obj.bar[0]();
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });
        });
      });

      context('when a getter is defined', () => {
        it('should use the getter', () => {
          const code = `
            const obj = new Proxy({}, { get: function(property) { return ${VALUE}; } })
            obj.bar;
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        context('when the getter uses an object property', () => {
          it('should be able to access the property', () => {
            const code = `
              const obj = new Proxy({ bar: ${VALUE} }, { get: function(object, property) { return object.bar; } })
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          context('when the property is a function', () => {
            it('should bind the function to the right object', () => {
              const code = `
                const obj = new Proxy({
                  bar: function() { return this.baz },
                  baz: ${VALUE}
                }, {
                  get: function(object, property) { return object[property]; }
                });
                obj.bar();
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });
        });
      });
    });
  });

  describe('globalSetter', () => {
    context('when setting a property on a regular object', () => {
      context('when setting the property with a period', () => {
        context('when setting the property to a literal', () => {
          context('when setting the property to a string', () => {
            it('should set the value', () => {
              const code = `
                const obj = {};
                obj.bar = '${VALUE}';
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE.toString());
            });
          });

          context('when setting the property to a number', () => {
            it('should set the value', () => {
              const code = `
                const obj = {};
                obj.bar = ${VALUE};
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when setting the property to a object', () => {
            it('should set the value', () => {
              const code = `
                const obj = {};
                obj.bar = { baz: ${VALUE} };
                obj.bar.baz;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });
        });

        context('when setting the property to an expression', () => {
          context('when the value is a MemberExpression', () => {
            it('should set the value', () => {
              const code = `
                const obj = {};
                const far = { bar: ${VALUE} }
                obj.bar = far.bar;
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when the value is an arbitrary expression', () => {
            it('should set the value', () => {
              const code = `
                function add(maybeNotFive, maybeFive) { return maybeNotFive + maybeFive; }
                const obj = {};
                const far = { bar: ${VALUE}, five: function() { return 5; } }
                obj.bar = add(far.bar, far.five());
                obj.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE + 5); //eslint-disable-line no-magic-numbers
            });
          });
        });

        context('when setting a two-level deep property', () => {
          it('should set the value', () => {
            const code = `
              const obj = {};
              obj.bar = {};
              obj.bar.baz = ${VALUE};
              obj.bar.baz;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('when setting the property with brackets', () => {
        context('when setting the property with a string literal', () => {
          it('should set the value', () => {
            const code = `
              const obj = {};
              obj['bar'] = ${VALUE};
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('when setting the property with a number literal', () => {
          it('should set the value', () => {
            const code = `
              const obj = {};
              obj[0] = ${VALUE};
              obj[0];
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('when setting the property with a variable', () => {
          it('should set the value', () => {
            const code = `
              const obj = {};
              const bar = 'baz';
              obj[bar] = ${VALUE};
              obj.baz;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('when setting the property with an arbitrary expression', () => {
          it('should set the value', () => {
            const code = `
              function returnB() { return 'b'; }
              const obj = {};
              const foo = { bar: 'a' };
              obj[returnB() + foo.bar + 'z'] = ${VALUE};
              obj.baz;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });
    });

    context('when setting a property on a proxy', () => {
      context('when no setter has been defined', () => {
        context('when setting the property with a period', () => {
          it('should set the value', () => {
            const code = `
              const obj = new Proxy({}, {});
              obj.bar = ${VALUE};
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should return the assigned value', () => {
            const code = `
              const obj = new Proxy({}, {});
              obj.bar = ${VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('when setting the property with brackets', () => {
          it('should set the value', () => {
            const code = `
              const obj = new Proxy({}, {});
              obj['bar'] = ${VALUE};
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });
      context('when a setter has been defined', () => {
        it('should use the setter', () => {
          const code = `
            const obj = new Proxy({}, { set: function(object, property, value) { return object.bar = ${VALUE} } });
            obj['bing'] = 'PAF';
            obj.bar;
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        it('should return the assigned value', () => {
          const code = `
            const obj = new Proxy({}, {
              set: function(object, property, value) {
                object.bar = value;
                return 'PAF';
              }
            });
            obj['bing'] = ${VALUE};
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        context('when setting a function', () => {
          it('should be binded on the object', () => {
            const code = `
              const obj = new Proxy({ bar: ${VALUE} }, { set: function(object, property, value) { object.baz = function() { return this.bar; } } });
              obj.bar = 5;
              obj.baz();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });
    });
  });
});

function build(code) {
  return babel.transform(
    code,
    {
      plugins: [require.resolve('../app.js')],
    },
  );
}

function buildRun(code, verbose) {
  const output = build(code).code;
  if (verbose === true) {
    console.log(output); // eslint-disable-line no-console
  }
  const result = eval(output); // eslint-disable-line no-eval
  expect(result).to.deep.equal(eval(code)); // eslint-disable-line no-eval
  return result;
}
