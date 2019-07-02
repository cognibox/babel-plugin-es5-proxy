const fs = require('fs');
const babylon = require('babylon');
const babel = require('@babel/core');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let variableIndex = 0;

let defaultGetName, defaultSetName, evalName, globalGetterName, globalSetterName, objectTargetName, proxyName;

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

function addRuntimeToFile(path, code) {
  const runtime = fs.readFileSync(
    require.resolve('./runtime.js')
  )
        .toString()
        .replace(/defaultGet/g, defaultGetName)
        .replace(/defaultSet/g, defaultSetName)
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

function variableName(prefix) {
  const base36 = 36;
  const randomString = Math.random().toString(base36).replace(/[^a-z]+/g, '');
  return `__${prefix}_${randomString}_${variableIndex++}`;
}

module.exports = ({ types }) => {
  function computeProperty(property, node) {
    if (property.type === 'Identifier' && !node.computed) {
      return types.stringLiteral(property.name);
    }

    return property;
  }

  const nodes = {
    AssignmentExpression(path) {
      if (path.node.left.type !== 'MemberExpression') return;

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
    },
    CallExpression(path) {
      if (path.node.callee.name === globalGetterName || path.node.callee.name === globalSetterName) return;
      if (path.node.callee.type !== 'MemberExpression') return;
      if (thisModifierFunctions.includes(path.node.callee.property.name)) return;

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
                  }
                ).code,
              ),
            ]
          ),
        );
        return;
      }

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
