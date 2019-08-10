module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings'
  ],
  env: {
    es6: true,
    node: true,
    browser: true,
    mocha: true
  },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: "module"
  }
};
