const expect = require('chai').expect;
const babel = require('@babel/core');

let VALUE;

describe('babel-plugin-es5-proxy @medium', () => {
  beforeEach(() => {
    VALUE = Math.random();
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

        expect(output).to.eq(VALUE);
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

            expect(output).to.eq(VALUE + 1);
          });

          it('should return the property plus 1', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo += 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE + 1);
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

            expect(output).to.eq(VALUE - 1);
          });

          it('should return the property minus 1', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo -= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE - 1);
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

            expect(output).to.eq(VALUE * n);
          });

          it('should return the property multiplied by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo *= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE * n);
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

            expect(output).to.eq(VALUE / n);
          });

          it('should return the property divided by 2', () => {
            const n = 2;
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo /= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE / n);
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

            expect(output).to.eq(NEW_VALUE % n);
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

            expect(output).to.eq(NEW_VALUE % n);
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

            expect(output).to.eq(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 5', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo &= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 31', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo |= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 26', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo ^= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE << 1); // eslint-disable-line no-bitwise
          });

          it('should return 40', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo <<= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE << 1); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE >>> 1); // eslint-disable-line no-bitwise
          });

          it('should return 2147483643', () => {
            const code = `
              const obj = { foo: ${VALUE} };
              obj.foo >>>= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE >>> 1); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(1);
          });

          it('should return the not incremented property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo++;
            `;

            const output = buildRun(code);

            expect(output).to.eq(0);
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

            expect(output).to.eq(1);
          });

          it('should return the incremented property', () => {
            const code = `
              const obj = { foo: 0 };
              ++obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.eq(1);
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

            expect(output).to.eq(-1);
          });

          it('should return the not decremented property', () => {
            const code = `
              const obj = { foo: 0 };
              obj.foo--;
            `;

            const output = buildRun(code);

            expect(output).to.eq(0);
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

            expect(output).to.eq(-1);
          });

          it('should return the decremented property', () => {
            const code = `
              const obj = { foo: 0 };
              --obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.eq(-1);
          });
        });
      });
    });
  });

  context('when using a proxy', () => {
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

            expect(output).to.eq(VALUE + 1);
          });

          it('should return the property plus 1', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo += 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE + 1);
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

            expect(output).to.eq(VALUE - 1);
          });

          it('should return the property minus 1', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo -= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE - 1);
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

            expect(output).to.eq(VALUE * n);
          });

          it('should return the property multiplied by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo *= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE * n);
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

            expect(output).to.eq(VALUE / n);
          });

          it('should return the property divided by 2', () => {
            const n = 2;
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo /= ${n};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE / n);
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

            expect(output).to.eq(NEW_VALUE % n);
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

            expect(output).to.eq(NEW_VALUE % n);
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

            expect(output).to.eq(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 5', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo &= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE & OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 31', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo |= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE | OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
          });

          it('should return 26', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo ^= ${OTHER_VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE ^ OTHER_VALUE); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE << 1); // eslint-disable-line no-bitwise
          });

          it('should return 40', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo <<= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE << 1); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(VALUE >>> 1); // eslint-disable-line no-bitwise
          });

          it('should return 2147483643', () => {
            const code = `
              const obj = new Proxy({ foo: ${VALUE} }, {});
              obj.foo >>>= 1;
            `;

            const output = buildRun(code);

            expect(output).to.eq(VALUE >>> 1); // eslint-disable-line no-bitwise
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

            expect(output).to.eq(1);
          });

          it('should return the not incremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo++;
            `;

            const output = buildRun(code);

            expect(output).to.eq(0);
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

            expect(output).to.eq(1);
          });

          it('should return the incremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              ++obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.eq(1);
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

            expect(output).to.eq(-1);
          });

          it('should return the not decremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              obj.foo--;
            `;

            const output = buildRun(code);

            expect(output).to.eq(0);
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

            expect(output).to.eq(-1);
          });

          it('should return the decremented property', () => {
            const code = `
              const obj = new Proxy({ foo: 0 }, {});
              --obj.foo;
            `;

            const output = buildRun(code);

            expect(output).to.eq(-1);
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

        expect(output).to.eq(VALUE);
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

        expect(output).to.eq(true);
      });

      context('when the deleteProperty handler does nothing', () => {
        it('should not delete the property', () => {
          const code = `
            const obj = new Proxy({ bar: ${VALUE} }, {deleteProperty(target, property) {}});
            delete obj.bar;
            obj.bar
          `;

          const output = buildRun(code);

          expect(output).to.eq(VALUE);
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

          expect(output).to.eq(true);
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
          index;
        `;

        const output = buildRun(code);

        expect(output).to.equal(VALUE);
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

        const numberOfCalledTime = 1;
        expect(output).to.equal(numberOfCalledTime);
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

      context('when this is a proxy', () => {

      });

      context('when argument is a proxy', () => {
        it('should pass the proxy.target as argument', () => {

        });

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
  return eval(output); // eslint-disable-line no-eval
}
