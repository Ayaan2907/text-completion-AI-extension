const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

// Store-ready production bundle via NODE_ENV=production (npm run build:prod).
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'cheap-module-source-map',
  entry: {
    popup: './src/popup.tsx',
    content: './src/content.ts',
    background: './src/background.ts',
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
    // Wipe stale artifacts (e.g. dev sourcemaps) before each build so the
    // store package never ships leftovers from a previous mode.
    clean: true,
  },
  // The settings popup bundles Mantine + React and is loaded from disk, not
  // the network — the 244 KiB default web budget does not apply to it.
  performance: {
    maxAssetSize: 512 * 1024,
    maxEntrypointSize: 512 * 1024,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json' },
        { from: 'src/popup.html' },
        { from: '../public/icon48.png' },
        { from: '../public/icon128.png' },
      ],
    }),
  ],
}; 