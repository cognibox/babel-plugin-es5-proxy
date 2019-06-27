const expect = require('chai').expect;
const babel = require('babel-core');

let VALUE;

describe('babel-plugin-es5-proxy @medium', () => {
  beforeEach(() => {
    VALUE = Math.random();
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

      context('when property is a function', () => {
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
      });
    });

    context('when accessing on a proxy', () => {
      context('when no getter is defined', () => {
        context('when property is not a function', () => {
          context('when property is accessed with a period', () => {
            it('should return the value', () => {
              const code = `
                const obj = new Proxy({ bar: ${VALUE} });
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
                  const obj = new Proxy({ bar: ${VALUE} });
                  obj['bar'];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when property is accessed with a variable', () => {
              it('should return the value', () => {
                const code = `
                  const obj = new Proxy({ bar: ${VALUE} });
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
              const obj = new Proxy({ bar: function() { return ${VALUE}; } });
              obj.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should bind this to the right object', () => {
            const code = `
              const obj = new Proxy({ baz: ${VALUE}, bar: function() { return this.baz; } });
              obj.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
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
              const obj = new Proxy({ bar: ${VALUE} }, { get: function(property) { return this.bar; } })
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          context('when the property is a function', () => {
            it('should bind the function to the right object', () => {
              const code = `
                const obj = new Proxy({ bar: function() { return this.baz }, baz: ${VALUE} }, { get: function(property) { return this.bar; } })
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
              const obj = new Proxy({});
              obj.bar = ${VALUE};
              obj.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should return the assigned value', () => {
            const code = `
              const obj = new Proxy({});
              obj.bar = ${VALUE};
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });

        context('when setting the property with brackets', () => {
          it('should set the value', () => {
            const code = `
              const obj = new Proxy({});
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
            const obj = new Proxy({}, { set: function(property, value) { return this.bar = ${VALUE} } });
            obj['bing'] = 'PAF';
            obj.bar;
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        it('should return the same value as the setter', () => {
          const code = `
            const obj = new Proxy({}, { set: function(property, value) { this.bar = value; return ${VALUE} } });
            obj['bing'] = 'PAF';
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        context('when setting a function', () => {
          it('should be binded on the object', () => {
            const code = `
              const obj = new Proxy({ bar: ${VALUE} }, { set: function(property, value) { this.baz = function() { return this.bar; } } });
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

function buildRun(code) {
  return eval(build(code).code); // eslint-disable-line no-eval
}
