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


export default ({ types }) => {
  const nodes = {
    AssignmentExpression(path) {
      path.replaceWith(
        types.callExpression(
          types.identifier('globalSetter'),
          [
            path.node.left.object,
            types.stringLiteral(path.node.left.property.name),
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
            types.stringLiteral(
              path.node.property.name,
            ),
          ],
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
