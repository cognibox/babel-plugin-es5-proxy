const fs = require('fs');
const babylon = require('babylon');

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
    MemberExpression(path) {
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
