const express = require('express')
const app = express()
const path = require('path')
const FcfsCache = require('./fcfsCache')
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb+srv://dbdict:Dbdict@cluster0.tejaf.mongodb.net/dictionary?retryWrites=true&w=majority')
}

const UserSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true,
    },
    meaning: {
        type: String,
        required: true,
    },
    usage1: {
        type: String,
    },
    usage2: {
        type: String,
    }
});

const db = mongoose.model("dictionary", UserSchema);


const Cache = new FcfsCache(10)
// const db = require('./Model/dictionary')


app.use(express.json())
app.use(express.static('public'))

console.log()

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
})

app.get('/search', function (req, res) {
    let searchWord = req.body.word
    searchWord = searchWord.toLowerCase()
    let start = searchWord.substr(0, 1);
    let rest = searchWord.substr(1)
    start = start.toUpperCase()
    searchWord = start + rest
    console.log(searchWord);


    let result;
    /*
        Using FCFS Cache
    */
    result = Cache.search(searchWord)

    console.log(result);
    if (!result) {
        db.findOne({ word: searchWord }, (err, data) => {
            if (data) {
                result = {
                    meaning: data.meaning,
                    usage_1: data.usage1,
                    usage_2: data.usage2
                }
            }
            else {
                result = {
                    error: 'word not found'
                }
            }

            Cache.insert(searchWord, result)  // Comment this line to disable cache

            res.send(result)
        })
    }
    else {
        res.send(result)
    }
})



app.listen(3000, () => {
    console.log(`http://localhost:3000`);
})