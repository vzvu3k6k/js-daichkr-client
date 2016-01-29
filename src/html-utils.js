const getText = (node) => {
  if (node.type === 'text') {
    return node.data;
  }
  if (node.children) {
    return node.children.reduce((text, childNode) => text + getText(childNode), '');
  }
  return '';
};

module.exports = { getText };
