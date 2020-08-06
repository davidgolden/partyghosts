const path = require('path');

module.exports = {
    mode: 'development',
    entry: path.resolve(__dirname, "client/src/index.js"),
    output: {
        filename: '[name]_bundle.js',
        path: path.resolve(__dirname, 'client/dist')
    },
    resolve: {
        extensions: ['.js'],
    },
    module: {
        rules: [
            {
                test: /\.js$|.jsx?$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: [
                            "@babel/plugin-proposal-class-properties",
                            "@babel/plugin-proposal-optional-chaining",
                        ],
                        presets: ['@babel/preset-env', ]
                    }
                }
            },
        ]
    },
}
