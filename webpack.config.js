// const path = require('path');

// module.exports = {
//   entry: './easyCanvas.ts',
//   module: {
//     rules: [
//       {
//         test: /\.tsx?$/,
//         use: 'ts-loader',
//         exclude: /node_modules/,
//       },
//     ],
//   },
//   resolve: {
//     extensions: ['.tsx', '.ts', '.js'],
//   },
//   output: {
//     filename: 'easyCanvas.bundle.js',
//     path: path.resolve(__dirname),
//   },
//   mode: "development"
// };

const path = require('path');

module.exports = {
  // Specify both entry points
  entry: {
    easyCanvas: './easyCanvas.ts',
    example2: './example2.ts',
  },
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
    // Use a dynamic filename to output each entry point's bundle
    filename: '[name].bundle.js', // This will create easyCanvas.bundle.js and example2.bundle.js
    path: path.resolve(__dirname, 'dist'), // Output to the './dist' directory
  },
  mode: "development"
};
