const fs = require('fs');
const babylon = require('babylon');
const babel = require('@babel/core');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let variableIndex = 0;

function addRuntimeToFile(path) {
  path.unshiftContainer(
    'body',
    babylon.parse(
      fs.readFileSync(
        require.resolve('./runtime.js')
      ).toString()
    ).program.body);
}

function variableName() {
  const wantedCharacterNumbers = 36;
  const randomString = Math.random().toString(wantedCharacterNumbers).replace(/[^a-z]+/g, '');
  return `tempVar_${randomString}_${variableIndex++}`;
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
          types.identifier('globalSetter'),
          [
            path.node.left.object,
            computeProperty(path.node.left.property, path.node.left),
            path.node.right,
          ],
        )
      );
    },
    CallExpression(path) {
      if (path.node.callee.name === 'globalGetter') return;
      if (path.node.callee.type !== 'MemberExpression') return;
      if (thisModifierFunctions.includes(path.node.callee.property.name)) return;

      if (path.node.callee.name === 'eval') {
        path.replaceWith(
          types.callExpression(
            types.identifier('_eval'),
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

      const variable = variableName();
      path.replaceWith(
        types.blockStatement(
          [
            types.variableDeclaration(
              'var',
              [
                types.variableDeclarator(
                  types.identifier(variable),
                  path.node.callee.object,
                ),
              ],
            ),
            types.expressionStatement(
              types.callExpression(
                types.memberExpression(
                  types.memberExpression(
                    types.identifier(variable),
                    computeProperty(path.node.callee.property, path.node.callee),
                    true,
                  ),
                  types.identifier('call'),
                ),
                [
                  types.callExpression(
                    types.identifier('objectTarget'),
                    [types.identifier(variable)],
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
          types.identifier('globalGetter'),
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
          types.identifier('Proxy2'),
          path.node.arguments,
        ),
      );
    },
  };

  return {
    visitor: {
      Program(path) {
        path.traverse(nodes);

        addRuntimeToFile(path);
      },
    },
  };
};
