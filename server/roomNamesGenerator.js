const {adjectives, nouns} = require("./roomNames");

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function generateIndex(arr) {
    return Math.floor(Math.random() * (arr.length - 0 + 1));
}

function generateRandomWord() {
    const n = capitalize(nouns[generateIndex(nouns)]);
    const a = capitalize(adjectives[generateIndex(adjectives)]);
    return a+n;
}

module.exports = {
    generateRandomWord,
}
