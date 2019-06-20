const fs = require('fs');
const babylon = require('babylon');

function addRuntimeToFile(path) {
  path.unshiftContainer(
    'body',
    babylon.parse(
      fs.readFileSync(
        require.resolve('./runtime.js')
      ).toString(),
    ).program.body
  );
}

function computeProperty(property, node) {
  if (property.type === 'Identifier' && !node.computed)
    return types.stringLiteral(property.name);

  return computedProperty = property;
}


module.exports = ({ types }) => {
  const nodes = {
    AssignmentExpression(path) {
      path.replaceWith(
        types.callExpression(
          types.identifier('globalSetter'),
          [
            path.node.left.object,
            computeProperty(path.node.left.property, path.node),
            path.node.right,
          ],
        ),
      );
    },
    MemberExpression(path) {
      path.replaceWith(
        types.callExpression(
          types.identifier('globalGetter'),
          [
            path.node.object,
            computeProperty(path.node.property, path.node)],
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
