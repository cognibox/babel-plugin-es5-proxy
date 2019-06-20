const expect = require('chai').expect;
const babel = require('babel-core');

let VALUE;

describe('babel-plugin-es5-proxy @medium', () => {
  beforeEach(() => {
    VALUE = Math.random();
  });

  describe('globalGetter', () => {
    context('when accessing on regular object', () => {
      context('when property is not a function', () => {
        context('when property is top-level', () => {
          context('when property is accessed with period', () => {
            it('should return the value', () => {
              const code = `
                const foo = { bar: VALUE };
                foo.bar;
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
                  const foo = { bar: VALUE };
                  foo['bar'];
                `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when property is a number', () => {
                it('should return the value', () => {
                  const code = `
                    const foo = { 0: VALUE };
                    foo[0];
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });
            });

            context('when property is a variable', () => {
              it('should return the value', () => {
                const code = `
                  const foo = { bar: VALUE };
                  const baz = 'bar';
                  foo[baz];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when property is an arbitrary expression', () => {
              it('should return the value', () => {
                const code = `
                  const foo = { bar: VALUE };
                  const r = 'r';
                  const a = { _: 'a' };
                  foo['b' + a._ + r];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when object is an arbitrary expression', () => {
              it('should return the value', () => {
                const code = `
                  const foo = { bar: VALUE };
                  const baz = { boo: function() { return foo; } };
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
                  const foo = { bar: { baz: VALUE } };
                  foo.bar.baz
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when accessing the second with brackets', () => {
              context('when accessing the second with a literal', () => {
                it('should return the value', () => {
                  const code = `
                    const foo = { bar: { baz: VALUE } };
                    foo.bar['baz']
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when accessing the second with a variable', () => {
                it('should return the value', () => {
                  const code = `
                    const foo = { bar: { baz: VALUE } };
                    const boo = 'baz';
                    foo.bar[boo]
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
                    const foo = { bar: { baz: VALUE } };
                    foo['bar'].baz
                  `;

                  const output = buildRun(code);

                  expect(output).to.equal(VALUE);
                });
              });

              context('when accessing the first with a variable', () => {
                it('should return the value', () => {
                  const code = `
                    const foo = { bar: { baz: VALUE } };
                    const boo = 'bar';
                    foo[boo].baz;
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
                      const foo = { bar: { baz: VALUE } };
                      foo['bar']['baz'];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });

                context('when accessing the second with a variable', () => {
                  it('should return the value', () => {
                    const code = `
                      const foo = { bar: { baz: VALUE } };
                      const boo = 'baz';
                      foo['bar'][boo];
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
                      const foo = { bar: { baz: VALUE } };
                      const far = 'bar';
                      foo[far]['baz'];
                    `;

                    const output = buildRun(code);

                    expect(output).to.equal(VALUE);
                  });
                });

                context('when accessing the second with a variable', () => {
                  it('should return the value', () => {
                    const code = `
                      const foo = { bar: { baz: VALUE } };
                      const far = 'bar';
                      const boo = 'baz';
                      foo[far][boo];
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
            const foo = { bar: function() { return ${VALUE}; } };
            foo.bar();
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        it('should bind this to the right object', () => {
          const code = `
            const foo = { bar: function() { return this.baz; }, baz: ${VALUE} };
            foo.bar();
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
                const foo = new Proxy({ bar: ${VALUE} });
                foo.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when property is accessed with brackets', () => {
            context('when property is accessed with a literal', () => {
              it('should return the value', () => {
                const code = `
                  const foo = new Proxy({ bar: ${VALUE} });
                  foo['bar'];
                `;

                const output = buildRun(code);

                expect(output).to.equal(VALUE);
              });
            });

            context('when property is accessed with a variable', () => {
              it('should return the value', () => {
                const code = `
                  const foo = new Proxy({ bar: ${VALUE} });
                  const baz = 'bar';
                  foo[baz];
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
              const foo = new Proxy({ bar: function() { return ${VALUE}; } });
              foo.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          it('should bind this to the right object', () => {
            const code = `
              const foo = new Proxy({ baz: ${VALUE}, bar: function() { return this.baz; } });
              foo.bar();
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('when a getter is defined', () => {
        it('should use the getter', () => {
          const code = `
            const foo = new Proxy({}, { get: function(property) { return ${VALUE}; } })
            foo.bar;
          `;

          const output = buildRun(code);

          expect(output).to.equal(VALUE);
        });

        context('when the getter uses an object property', () => {
          it('should be able to access the property', () => {
            const code = `
              const foo = new Proxy({ bar: ${VALUE} }, { get: function(property) { return this.bar; } })
              foo.bar;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });

          context('when the property is a function', () => {
            it('should bind the function to the right object', () => {
              const code = `
                const foo = new Proxy({ bar: function() { return this.baz }, baz: ${VALUE} }, { get: function(property) { return this.bar; } })
                foo.bar();
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
                const foo = {};
                foo.bar = '${VALUE}';
                foo.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE.toString());
            });
          });

          context('when setting the property to a number', () => {
            it('should set the value', () => {
              const code = `
                const foo = {};
                foo.bar = ${VALUE};
                foo.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when setting the property to a object', () => {
            it('should set the value', () => {
              const code = `
                const foo = {};
                foo.bar = { baz: ${VALUE} };
                foo.bar.baz;
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
                const foo = {};
                const far = { bar: ${VALUE} }
                foo.bar = far.bar;
                foo.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE);
            });
          });

          context('when the value is an arbitrary expression', () => {
            it('should set the value', () => {
              const code = `
                function add(maybeNotFive, maybeFive) { return maybeNotFive + maybeFive; }
                const foo = {};
                const far = { bar: ${VALUE}, five: function() { return 5; } }
                foo.bar = add(far.bar, far.five());
                foo.bar;
              `;

              const output = buildRun(code);

              expect(output).to.equal(VALUE + 5);
            });
          });
        });

        context('when setting a two-level deep property', () => {
          it('should set the value', () => {
            const code = `
              const foo = {};
              foo.bar = {};
              foo.bar.baz = ${VALUE};
              foo.bar.baz;
            `;

            const output = buildRun(code);

            expect(output).to.equal(VALUE);
          });
        });
      });

      context('when setting ')
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
  return eval(build(code).code);
}
