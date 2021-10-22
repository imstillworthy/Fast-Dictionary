const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const FcfsCache = require('./util/fcfsCache')


const Cache = new FcfsCache(1)


app.use(express.json())
app.use(express.static('public'))


var suggestions = []


function TrieNode(key) {
    // the "key" value will be the character in sequence
    this.key = key;

    // the "meaning" value will be the character in sequence
    this.meaning = null;

    // the "usage_1" value will be the character in sequence
    this.usage_1 = null;

    // the "usage_2" value will be the character in sequence
    this.usage_2 = null;

    // we keep a reference to parent
    this.parent = null;

    // we have hash of children
    this.children = {};

    // check to see if the node is at the end
    this.end = false;
}

// -----------------------------------------

// we implement Trie with just a simple root with null value.
function Trie() {
    this.root = new TrieNode(null);
}

// inserts a word into the trie.
// time complexity: O(k), k = word length
Trie.prototype.insert = function (word, meaning, usage_1, usage_2) {
    var node = this.root; // we start at the root 

    // for every character in the word
    for (var i = 0; i < word.length; i++) {
        // check to see if character node exists in children.
        if (!node.children[word[i]]) {
            // if it doesn't exist, we then create it.
            node.children[word[i]] = new TrieNode(word[i]);

            // we also assign the parent to the child node.
            node.children[word[i]].parent = node;
        }

        // proceed to the next depth in the trie.
        node = node.children[word[i]];

        // finally, we check to see if it's the last word.
        if (i == word.length - 1) {
            // if it is, we set the end flag to true.
            node.end = true;
            node.usage_1 = usage_1;
            node.usage_2 = usage_2;
            node.meaning = meaning;
        }
    }
};

// check if it contains a whole word.
// time complexity: O(k), k = word length
Trie.prototype.contains = function (word) {
    var node = this.root;

    // for every character in the word
    for (var i = 0; i < word.length; i++) {
        // check to see if character node exists in children.
        if (node.children[word[i]]) {
            // if it exists, proceed to the next depth of the trie.
            node = node.children[word[i]];
        } else {
            // doesn't exist, return false since it's not a valid word.
            return false;
        }
    }

    // we finished going through all the words, but is it a whole word?
    return node.end;
};

// returns every word with given prefix
// time complexity: O(p + n), p = prefix length, n = number of child paths
Trie.prototype.find = function (prefix) {
    var node = this.root;
    var output = [];

    // for every character in the prefix
    for (var i = 0; i < prefix.length; i++) {
        // make sure prefix actually has words
        if (node.children[prefix[i]]) {
            node = node.children[prefix[i]];
        } else {
            // there's none. just return it.
            return output;
        }
    }

    // recursively find all words in the node
    findAllWords(node, output);

    return output;
};


// iterates through the parents to get the word.
// time complexity: O(k), k = word length
TrieNode.prototype.getWord = function () {
    var output = [];
    var node = this;

    while (node !== null) {
        output.unshift(node.key);
        node = node.parent;
    }

    return output.join('');
};

// recursive function to find all words in the given node.
function findAllWords(node) {
    // base case, if node is at a word, push to output
    if (node.end) {
        suggestions.unshift(node.getWord());
    }

    // iterate through each children, call recursive findAllWords
    for (var child in node.children) {
        findAllWords(node.children[child]);
    }
}
//finding meaning 

Trie.prototype.meaning = function (prefix) {
    var node = this.root;

    // for every character in the prefix
    for (var i = 0; i < prefix.length; i++) {
        // make sure prefix actually has words
        if (node.children[prefix[i]]) {
            node = node.children[prefix[i]];
        } else {
            // there's none. just return it.
            return ["none", "none", "none"];
        }
    }

    return [node.meaning, node.usage_1, node.usage_2]

};


// instantiate our trie
var trie = new Trie();

const data = fs.readFileSync("util/data.json")
const obj = JSON.parse(data)

obj.forEach(element => {
    trie.insert(element.Word, element.Meaning, element['Examples/0'], element['Examples/1'])
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
})

app.get('/search', function (req, res) {
    var startTime = Date.now();

    let searchWord = req.body.word
    searchWord = searchWord.toLowerCase()

    console.log("Word Searched = " + searchWord);
    let result;
    /*
        Using FCFS Cache
    */
    result = Cache.search(searchWord)
    if (!result) {
        console.log('Cache Miss');
        const resultArr = trie.meaning(searchWord)
        // console.log(resultArr);
        if (resultArr[0]!=null) {
            result = {
                meaning: resultArr[0],
                usage_1: resultArr[1],
                usage_2: resultArr[2]
            }
        }
        else {
            result = {
                error: 'word not found'
            }
        }
        Cache.insert(searchWord, result)
    }
    else {
        console.log('Cache Hit');
    }
    res.send(result)
    var endTime = Date.now();
    console.log(`Execution time: ${endTime - startTime} ms\n`);
})

app.get('/autofill', function (req, res) {
    const searchWord = req.body.word
    console.log(searchWord);
    suggestions = []
    trie.find(searchWord)
    console.log(suggestions);
    res.send({
        suggestions: suggestions
    })
})

app.listen(3000, () => {
    console.log(`Listening at http://localhost:3000\n`);
})