module.exports = {
  entry: ['src/main.ts', 'src/lambda.ts', 'serverless.ts'],
  ignoreDependencies: [/.*serverless-.*/, 'preact'],
};
