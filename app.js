const fs = require('fs');
const babylon = require('babylon');
const thisModifierFunctions = ['apply', 'bind', 'call'];

let variableIndex = 0;

function addRuntimeToFile(path) {
  const code = fs.readFileSync(require.resolve('./runtime.js')).toString();

  path.unshiftContainer('body', babylon.parse(code).program.body);
}

function computeProperty(property, node, types) {
  if (property.type === 'Identifier' && !node.computed) {
    return types.stringLiteral(property.name);
  }

  return property;
}

function variableName() {
  const wantedCharacterNumbers = 36;
  const randomString = Math.random().toString(wantedCharacterNumbers).replace(/[^a-z]+/g, '');
  return `tempVar_${randomString}_${variableIndex++}`;
}

module.exports = ({ types }) => {
  const nodes = {
    AssignmentExpression(path) {
      if (path.node.left.type !== 'MemberExpression') return;

      const args = [
        path.node.left.object,
        computeProperty(path.node.left.property, path.node.left, types),
        path.node.right,
      ];

      path.replaceWith(types.callExpression(types.identifier('globalSetter'), args));
    },
    CallExpression(path) {
      if (path.node.callee.name === 'globalGetter') return;
      if (path.node.callee.type !== 'MemberExpression') return;
      if (thisModifierFunctions.includes(path.node.callee.property.name)) return;

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
                    computeProperty(path.node.callee.property, path.node.callee, types),
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

      const args = [
        path.node.object,
        computeProperty(path.node.property, path.node, types),
      ];
      path.replaceWith(types.callExpression(types.identifier('globalGetter'), args));
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
