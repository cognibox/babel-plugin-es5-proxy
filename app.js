const fs = require('fs');
const babylon = require('babylon');
const babel = require('@babel/core');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let variableIndex = 0;

let defaultGetName, defaultSetName, evalName, globalGetterName, globalSetterName, objectTargetName, proxyName;

function addRuntimeToFile(path) {
  const runtime = fs.readFileSync(require.resolve('./runtime.js'))
    .toString()
    .replace(/defaultGet/g, defaultGetName)
    .replace(/defaultSet/g, defaultSetName)
    .replace(/_eval/g, evalName)
    .replace(/globalGetter/g, globalGetterName)
    .replace(/globalSetter/g, globalSetterName)
    .replace(/objectTarget/g, objectTargetName)
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
    useBuiltIns: useBuiltIns || false,
    targets,
    modules: modules || false,
  };

  return [[require('@babel/preset-env').default, presentEnvConf]];
}

function setVariableNames() {
  if (defaultGetName) return;

  defaultGetName = variableName('default_get');
  defaultSetName = variableName('default_set');
  evalName = variableName('eval');
  globalGetterName = variableName('global_getter');
  globalSetterName = variableName('global_setter');
  objectTargetName = variableName('object_target');
  proxyName = variableName('proxy');
}

function variableName(prefix) {
  const base36 = 36;
  const randomString = Math.random().toString(base36).replace(/[^a-z]+/g, '');
  return `__${prefix}_${randomString}_${variableIndex++}`;
}

module.exports = ({ types } = {}, options = {}) => {
  function computeProperty(property, node) {
    if (property.type === 'Identifier' && !node.computed) {
      return types.stringLiteral(property.name);
    }

    return property;
  }

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
    CallExpression(path) {
      if (path.node.callee.name === globalGetterName || path.node.callee.name === globalSetterName) return;

      if (path.node.callee.name === 'eval') {
        path.replaceWith(
          types.callExpression(
            types.identifier(evalName),
            [
              types.stringLiteral(
                babel.transform(
                  path.node.arguments[0].value,
                  {
                    plugins: [require.resolve('./app.js')],
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
        if (thisModifierFunctions.includes(path.node.callee.property.name)) return;

        const tempVariableName = variableName('temp');
        path.replaceWith(
          types.blockStatement(
            [
              types.variableDeclaration(
                'var',
                [
                  types.variableDeclarator(
                    types.identifier(tempVariableName),
                    path.node.callee.object,
                  ),
                ],
              ),
              types.expressionStatement(
                types.callExpression(
                  types.memberExpression(
                    types.memberExpression(
                      types.identifier(tempVariableName),
                      computeProperty(path.node.callee.property, path.node.callee),
                      true,
                    ),
                    types.identifier('call'),
                  ),
                  [
                    types.callExpression(
                      types.identifier(objectTargetName),
                      [types.identifier(tempVariableName)],
                    ),
                    ...path.node.arguments,
                  ],
                ),
              ),
            ],
          ),
        );
      }
    },
    MemberExpression(path) {
      if (thisModifierFunctions.includes(path.node.property.name)) return;

      path.replaceWith(
        types.callExpression(
          types.identifier(globalGetterName),
          [
            path.node.object,
            computeProperty(path.node.property, path.node, types),
          ],
        ),
      );
    },
    NewExpression(path) {
      if (path.node.callee.name !== 'Proxy') return;

      path.replaceWith(
        types.newExpression(
          types.identifier(proxyName),
          path.node.arguments,
        ),
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

        path.traverse(nodes);

        addRuntimeToFile(path);
      },
    },
  };
};
