const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        game: [
            "./client/src/index.js",
            "./client/src/chat.js",
        ],
    },
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
                        presets: ['@babel/preset-env', "@babel/preset-react"]
                    }
                }
            },
            {
                test: /\.s?css$/,
                use: [
                    "style-loader", // creates style nodes from JS strings
                    { loader: "css-loader", options: {modules: true}},
                    "sass-loader" // compiles Sass to CSS, using Node Sass by default
                ]
            }
        ]
    },
}
