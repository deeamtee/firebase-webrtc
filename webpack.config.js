/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './index.js',
    devServer: {
        static: {
          directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
        hot: true,
      },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: 'inline-source-map',
    mode: 'production',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [{
          test: /\.js$/,
          use: 'babel-loader',
          exclude: '/node_modules/'
        },
          // Чтобы все файлы с указанными расширениями не лежали в одной директории, можно советовать, чтобы изображения и шрифты были размещены в отдельных папках:
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/,
            type: 'asset/resource',
            generator: {
              filename: 'images/[name].[hash][ext]',
            }
          },
          {
            test: /\.(woff|woff2|eot|ttf|otf)$/i,
            type: 'asset/resource',
            generator: {
              filename: 'fonts/[name].[hash][ext]',
            }
          },
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, {
              loader: 'css-loader',
              options: {
                importLoaders: 1
              }
            },
              'postcss-loader'
            ]
          },
        ]
      },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
            }),
        ],
    },
    plugins: [new HtmlWebpackPlugin(
        { template: './index.html' }
    ),
    new MiniCssExtractPlugin()
],
};
