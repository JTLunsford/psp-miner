var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/main.ts',
    output: {
        path: './dist',
        filename: 'app.js'
    },
    module: {
        loaders: [
            { test: /\.ts$/, loader: 'ts' },
            { test: /\.css$/, loader: "style-loader!css-loader" }
        ]
    },
    resolve: {
        extensions: ['', '.js', '.ts']
    },
    plugins: [
        new HtmlWebpackPlugin({
          title: 'psp miner',
          template: './src/index.html'
        })
    ]
};