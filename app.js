const fs = require('fs');
const babylon = require('babylon');
const babel = require('@babel/core');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let evalName,
    globalCallerName,
    globalDeleterName,
    globalGetterName,
    globalHasName,
    globalInstanceofName,
    globalMemberCallerName,
    globalSetterName,
    inObjectName,
    isProxyName,
    objectTargetName,
    proxyName;

function addRuntimeToFile(path) {
  const runtime = fs.readFileSync(require.resolve('./runtime.js'))
    .toString()
    .replace(/nativePatchCalled/g, variableName('native_patch_called'))
    .replace(/globalCaller/g, globalCallerName)
    .replace(/globalDeleter/g, globalDeleterName)
    .replace(/globalGetter/g, globalGetterName)
    .replace(/globalHas/g, globalHasName)
    .replace(/globalInstanceof/g, globalInstanceofName)
    .replace(/globalMemberCaller/g, globalMemberCallerName)
    .replace(/globalSetter/g, globalSetterName)
    .replace(/inObject/g, inObjectName)
    .replace(/isProxy/g, isProxyName)
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
  globalCallerName = variableName('global_caller');
  globalDeleterName = variableName('global_deleter');
  globalGetterName = variableName('global_getter');
  globalHasName = variableName('global_has');
  globalInstanceofName = variableName('global_instanceof');
  globalMemberCallerName = variableName('global_member_caller');
  globalSetterName = variableName('global_setter');
  inObjectName = variableName('in_object');
  isProxyName = variableName('is_proxy');
  objectTargetName = variableName('object_target');
  proxyName = variableName('proxy');
}

function variableName(name) {
  return `__$${name}$__`;
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
      const nodeName = path.node.callee.name;

      if (nodeName && nodeName.startsWith('__$') && nodeName.endsWith('$__')) return;

      if (nodeName === 'eval') {
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
        path.replaceWith(
          types.callExpression(
            types.identifier(globalMemberCallerName),
            [
              path.node.callee.object,
              computeProperty(path.node.callee.property, path.node.callee),
              types.arrayExpression(
                path.node.arguments,
              ),
            ],
          ),
        );
      } else {
        path.replaceWith(
          types.callExpression(
            types.identifier(globalCallerName),
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

        path.traverse(nodes);
        path.traverse(restoreEvalNodes);

        if (!options.isChildProcess) addRuntimeToFile(path);
      },
    },
  };
};
