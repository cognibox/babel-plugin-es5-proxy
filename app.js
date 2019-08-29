const fs = require('fs');
const babylon = require('babylon');
const babel = require('@babel/core');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let evalName,
    globalDeleterName,
    globalGetterName,
    globalHasName,
    globalInstanceofName,
    globalSetterName,
    inObjectName,
    isProxyName,
    objectFunctionsName,
    objectTargetName,
    proxyName;

function addRuntimeToFile(path) {
  const runtime = fs.readFileSync(require.resolve('./runtime.js'))
    .toString()
    .replace(/globalDeleter/g, globalDeleterName)
    .replace(/globalGetter/g, globalGetterName)
    .replace(/globalHas/g, globalHasName)
    .replace(/globalSetter/g, globalSetterName)
    .replace(/globalInstanceof/g, globalInstanceofName)
    .replace(/inObject/g, inObjectName)
    .replace(/isProxy/g, isProxyName)
    .replace(/objectTarget/g, objectTargetName)
    .replace(/OBJECT_FUNCTIONS/g, objectFunctionsName)
    .replace(/Proxy/g, proxyName);

  path.unshiftContainer(
    'body',
    babylon.parse(
      runtime
    ).program.body
  );
}

function computePresets({ useBuiltIns, targets, modules }) {
  if (typeof targets === 'undefined') {
    targets = { ie: 9 };
  }

  const presentEnvConf = {
    forceAllTransforms: true,
    useBuiltIns,
    targets,
    modules: modules || false,
  };

  if (!!useBuiltIns) { presentEnvConf.corejs = 3; } // eslint-disable-line no-extra-boolean-cast

  return [[require('@babel/preset-env').default, presentEnvConf]];
}

function setVariableNames() {
  if (evalName) return;

  evalName = variableName('temp_eval');
  globalDeleterName = variableName('global_deleter');
  globalGetterName = variableName('global_getter');
  globalHasName = variableName('global_has');
  globalInstanceofName = variableName('global_instanceof');
  globalSetterName = variableName('global_setter');
  inObjectName = variableName('in_object');
  isProxyName = variableName('is_proxy');
  objectTargetName = variableName('object_target');
  objectFunctionsName = variableName('object_functions');
  proxyName = variableName('proxy');
}

function variableName(name) {
  return `__$${name}$__`;
}

function randomVariableName(name) {
  let r = Math.random().toString(36).substring(7);
  return `__$${name}$__$${r}$__`;
}

module.exports = ({ types } = {}, options = {}) => {
  function computeProperty(property, node) {
    if (property.type === 'Identifier' && !node.computed) {
      return types.stringLiteral(property.name);
    }

    return property;
  }

  const restoreEvalNodes = {
    CallExpression(path) {
      if (path.node.callee.name === evalName) {
        path.replaceWith(
          types.callExpression(
            types.identifier('eval'),
            path.node.arguments,
          ),
        );
      }
    },
  };

  function expressionToStatement(expression) {
    if (expression) {
      return types.isExpression(expression) ? types.expressionStatement(expression) : expression;
    } else {
      return types.emptyStatement();
    }
  }

  function labelTransform(label) {
    return `${label}_THISLABELHASBEENCHANGED`;
  }

  const forToWhileNodes = {
    ForStatement(path) {
      if (!types.isLabeledStatement(path.parent)) {
        path.replaceWith(
          types.blockStatement(
            [
              expressionToStatement(path.node.init),
              types.whileStatement(
                path.node.test || types.identifier('true'),
                types.blockStatement(
                  [
                    expressionToStatement(path.node.body),
                    expressionToStatement(path.node.update),
                  ]
                )
              ),
            ],
          ),
        );
      }
    },
    LabeledStatement(path) {
      if (types.isForStatement(path.node.body)) {
        path.replaceWith(
          types.blockStatement(
            [
              expressionToStatement(path.node.body.init),
              types.functionDeclaration(
                types.identifier(`my_super_cool_function_${labelTransform(path.node.label.name)}`),
                [],
                types.blockStatement(
                  [expressionToStatement(path.node.body.update)],
                ),
              ),
              types.labeledStatement(
                types.identifier(
                  labelTransform(path.node.label.name),
                ),
                types.whileStatement(
                  path.node.body.test || types.identifier('true'),
                  types.blockStatement(
                    [
                      expressionToStatement(path.node.body.body),
                      expressionToStatement(
                        types.callExpression(
                          types.identifier(`my_super_cool_function_${labelTransform(path.node.label.name)}`),
                          []
                        ),
                      ),
                    ]
                  )
                ),
              ),
            ],
          ),
        );
      } else if (types.isWhileStatement(path.node.body)) {
        if (!path.node.label.name.match(/_THISLABELHASBEENCHANGED/)) {
          path.replaceWith(
            types.blockStatement(
              [
                types.functionDeclaration(
                  types.identifier(`my_super_cool_function_${labelTransform(path.node.label.name)}`),
                  [],
                  types.blockStatement([]),
                ),
                types.labeledStatement(
                  types.identifier(
                    labelTransform(path.node.label.name),
                  ),
                  path.node.body,
                ),
              ],
            ),
          );
        }
      } else {
        if (!path.node.label.name.match(/_THISLABELHASBEENCHANGED/)) {
          path.replaceWith(
            types.labeledStatement(
              types.identifier(
                labelTransform(path.node.label.name),
              ),
              path.node.body,
            ),
          );
        }
      }
    },
    ContinueStatement(path) {
      if (path.node.label && !path.node.label.name.match(/_THISLABELHASBEENCHANGED/)) {
        path.replaceWith(
          types.blockStatement(
            [
              expressionToStatement(
                types.callExpression(
                  types.identifier(`my_super_cool_function_${labelTransform(path.node.label.name)}`),
                  []
                ),
              ),
              types.ContinueStatement(
                types.identifier(labelTransform(path.node.label.name)),
              )
            ]
          ),
        );
      }
    },
    BreakStatement(path) {
      if (path.node.label && !path.node.label.name.match(/_THISLABELHASBEENCHANGED/)) {
        path.replaceWith(
          types.BreakStatement(
            types.identifier(labelTransform(path.node.label.name)),
          )
        );
      }
    },
  };

  const nodes = {
    AssignmentExpression(path) {
      if (path.node.left.type !== 'MemberExpression') return;

      if (path.node.operator === '=') {
        path.replaceWith(
          types.callExpression(
            types.identifier(globalSetterName),
            [
              path.node.left.object,
              computeProperty(path.node.left.property, path.node.left),
              path.node.right,
            ],
          )
        );
      } else {
        path.replaceWith(
          types.assignmentExpression(
            '=',
            path.node.left,
            types.binaryExpression(
              path.node.operator.replace('=', ''),
              path.node.left,
              path.node.right,
            ),
          ),
        );
      }
    },
    BinaryExpression(path) {
      if (path.node.operator === 'in') {
        path.replaceWith(
          types.callExpression(
            types.identifier(globalHasName),
            [
              path.node.right,
              path.node.left,
            ]
          ),
        );
      } else if (path.node.operator === 'instanceof') {
        path.replaceWith(
          types.callExpression(
            types.identifier(globalInstanceofName),
            [
              path.node.left,
              path.node.right,
            ],
          ),
        );
      }
    },
    CallExpression(path) {
      if (path.node.callee.name === globalGetterName || path.node.callee.name === globalSetterName || path.node.callee.name === 'globalCaller' || path.node.callee.name === evalName) return;

      if (path.node.callee.name === 'eval') {
        path.replaceWith(
          types.callExpression(
            types.identifier(evalName),
            [
              types.stringLiteral(
                babel.transform(
                  path.node.arguments[0].value,
                  {
                    plugins: [[require.resolve('./app.js'), { isChildProcess: true }]],
                    presets: computePresets(options),
                  }
                ).code,
              ),
            ]
          ),
        );
        return;
      }

      if (path.node.callee.type === 'MemberExpression') {
        const tempVariableName = randomVariableName('temp_var');
        path.replaceWith(
            types.blockStatement(
              [
                types.variableDeclaration(
                  'var',
                  [
                    types.variableDeclarator(
                      types.identifier(tempVariableName),
                      path.node.callee.object,
                    )
                  ]
                ),
                types.expressionStatement(
                  types.callExpression(
                    types.identifier('globalCaller'),
                    [
                      types.memberExpression(
                        types.identifier(tempVariableName),
                        computeProperty(path.node.callee.property, path.node.callee),
                        true,
                      ),
                      types.identifier(
                        tempVariableName
                      ),
                      types.arrayExpression(path.node.arguments),
                    ]
                  ),
                ),
              ]
          )
        );
      } else {
        path.replaceWith(
          types.callExpression(
            types.identifier('globalCaller'),
            [
              path.node.callee,
              types.identifier('undefined'),
              types.arrayExpression(
                path.node.arguments,
              ),
            ]
          )
        );
      }
    },
    ForInStatement(path) {
      if (path.node.right.type === 'CallExpression' && path.node.right.callee.name === objectTargetName) return;

      path.replaceWith(
        types.forInStatement(
          path.node.left,
          types.callExpression(
            types.identifier(objectTargetName),
            [path.node.right]
          ),
          path.node.body,
        ),
      );
    },
    MemberExpression(path) {
      if (thisModifierFunctions.includes(path.node.property.name)) return;

      path.replaceWith(
        types.callExpression(
          types.identifier(globalGetterName),
          [
            path.node.object,
            computeProperty(path.node.property, path.node),
          ],
        ),
      );
    },
    NewExpression(path) {
      if (path.node.callee.name !== 'Proxy') return;

      path.replaceWith(
        types.newExpression(
          types.memberExpression(
            types.identifier('window'),
            types.identifier(proxyName),
          ),
          path.node.arguments,
        )
      );
    },
    UnaryExpression(path) {
      if (path.node.operator !== 'delete') return;
      if (path.node.argument.type !== 'MemberExpression') return;

      path.replaceWith(
        types.callExpression(
          types.identifier(globalDeleterName),
          [
            path.node.argument.object,
            computeProperty(
              path.node.argument.property,
              path.node.argument,
            ),
          ]
        )
      );
    },
    UpdateExpression(path) {
      if (path.node.argument.type !== 'MemberExpression') return;

      if (path.node.operator === '++') {
        if (path.node.prefix) {
          path.replaceWith(
            types.assignmentExpression(
              '=',
              path.node.argument,
              types.binaryExpression(
                '+',
                path.node.argument,
                types.numericLiteral(1),
              ),
            ),
          );
        } else {
          path.replaceWith(
            types.binaryExpression(
              '-',
              types.assignmentExpression(
                '=',
                path.node.argument,
                types.binaryExpression(
                  '+',
                  path.node.argument,
                  types.numericLiteral(1),
                ),
              ),
              types.numericLiteral(1),
            )
          );
        }
      } else if (path.node.operator === '--') {
        if (path.node.prefix) {
          path.replaceWith(
            types.assignmentExpression(
              '=',
              path.node.argument,
              types.binaryExpression(
                '-',
                path.node.argument,
                types.numericLiteral(1),
              ),
            ),
          );
        } else {
          path.replaceWith(
            types.binaryExpression(
              '+',
              types.assignmentExpression(
                '=',
                path.node.argument,
                types.binaryExpression(
                  '-',
                  path.node.argument,
                  types.numericLiteral(1),
                ),
              ),
              types.numericLiteral(1),
            )
          );
        }
      }
    },
  };

  return {
    visitor: {
      Program(path) {
        setVariableNames();

        path.traverse(forToWhileNodes);
        path.traverse(nodes);
        path.traverse(restoreEvalNodes);

        if (!options.isChildProcess) addRuntimeToFile(path);
      },
    },
  };
};
