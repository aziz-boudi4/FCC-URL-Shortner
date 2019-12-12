'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');
var cors = require('cors');

var app = express();
let MONGO_URI="mongodb+srv://azicode4:Sarah94ob84@cluster0-zy1an.mongodb.net/test?retryWrites=true&w=majority"

// Basic Configuration
var port = process.env.PORT || 3001;

/** this project needs a db !! **/
mongoose.connect(MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

// mongoose connection state
console.log('mongoose.connection.readyState',mongoose.connection.readyState);


// Schema url
var Schema = mongoose.Schema;

// Create the Schema
var urlSchema = new Schema({
  id: Number,
  original_url: String,
});

// Create the Model
var theUrlModel = mongoose.model("shortUrl", urlSchema);


app.use(cors());
/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// serve the static files the css
app.use('/public', express.static(process.cwd() + '/public'));

// at the root when someone makes a get request we serve the html/css
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});


app.post("/api/shorturl/new", function(req, res) {
  // grab theposted url in the form
  let grabbedUrl = req.body.url;
  let theDataInTheDb;
  let isUrlInDataBase;
  // check if the url that the user gave us is valid
  let urlRegex = /https:\/\/www.|http:\/\/www./g;

  console.log('......grabbedUrl...req.body.url', grabbedUrl)

  console.log("req.body.url.replace(urlRegex,'')", req.body.url.replace(urlRegex,''))

  // Dns lookup
  dns.lookup(grabbedUrl.replace(urlRegex, ''), (error,address,family) => {
    if (error) {
      res.json({"error": error})
    }  else  {
      dnsFound();
    }
    console.log(error,address,family)
  });



  function dnsFound() {
    theUrlModel
    .find()
    .exec()
    .then( docs => {
      theDataInTheDb = docs // use length as an id (it'll be different everytime as new urls are added)
      console.log('theDataInTheDb', theDataInTheDb)

      // the url object to either save or if already exist don't save
      let doc = new theUrlModel({ "original_url":  grabbedUrl, "id": theDataInTheDb.length })

      isUrlInDataBase = theDataInTheDb.filter((obj) => obj["original_url"] === req.body.url);
      console.log('isUrlInDataBase', isUrlInDataBase)

      // check if the url is already in the DB otherwise save it
      if (isUrlInDataBase.length === 0) {
        // save in db
        doc.save()
        .then(result => {
          res.json(result);
        })
        .catch(err => {
          console.log('err', err);
          res.json({"error": err})
        });
      } else {
        // if already in db show it s id
        res.json({"error": `the URL does already exist as id ${isUrlInDataBase[0].id}`})
      }
    })
    .catch(error => {
      console.log('error', error);
      res.json({ "error": error });
    });
  };
});

// It will return all the DB
app.get("/api/shorturl", function (req, res) {
  theUrlModel
  .find()
  .exec()
  .then(docs => {
    res.json(docs)
  })
  .catch(err => {
    console.log(err);
    res.json({"error" : err});
  });
});


// The Shortcut
app.get("/api/shorturl/:short", function (req, res) {
  console.log('req.params', req.params)
  console.log('req.params.short', req.params.short)

  let short = req.params.short;

  theUrlModel
  .find({ "id" : short })
  .exec()
  .then(docs => {
    let redirectionWebsite = docs[0]["original_url"]

    // get rid of http://
    let result = redirectionWebsite.split('//')
    let finalResultNoHTTP = result.length > 1 ? result.splice(1,1).join() : result[0]

    console.log('..........finalResultNoHTTP', finalResultNoHTTP)

    res.redirect("http://" + finalResultNoHTTP)
  })
  .catch(err => {
    console.log(err);
    res.json({ "error" : err });
  })
})

// listen for requests :)
// https://stackoverflow.com/questions/23647593/nodemon-express-listen-port
app.set('port', 3001);
var listener = app.listen(app.get('port'), function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
