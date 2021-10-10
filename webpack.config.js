const path = require('path');

module.exports = {
  entry: './easyCanvas.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'easyCanvas.bundle.js',
    path: path.resolve(__dirname),
  },
  mode: "development"
};

