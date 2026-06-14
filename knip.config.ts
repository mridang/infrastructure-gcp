export default {
  entry: [
    'projects/*/src/index.ts',
    'projects/*/src/**/*.ts',
    'Pulumi.yaml',
    'projects/*/Pulumi.yaml',
  ],
  ignore: ['knip.config.ts'],
  ignoreDependencies: [/^@semantic-release\//],
  ignoreBinaries: ['pulumi'],
};
