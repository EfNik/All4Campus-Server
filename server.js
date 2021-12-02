const express = require('express');
const app = express();
const logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const { response } = require('express');
const {MongoClient} = require('mongodb');

app.use(bodyParser.urlencoded({ extended:false})); //parses url encoded bodies
app.use(bodyParser.json()); // semd json repsonses
app.use(logger('dev')); // log request to api using morgan
app.use(cors());

// Routes
app.post('/api/test', function(req,res){

    console.log(req.body);

    var repsonse = "Received";
    res.json(response);

})

//connect to db

const uri = "mongodb+srv://IotProject:all4campus@cluster0.qsqpb.mongodb.net/Iot";
const client = new MongoClient(uri);

//show db names
client
  .connect()
  .then(client =>
    client
      .db()
      .admin()
      .listDatabases() // Returns a promise that will resolve to the list of databases
  )
  .then(dbs => {
    console.log("Mongo databases", dbs);
  })
  .finally(() => client.close()); // Closing after getting the data


// Listen

app.listen(8080);
console.log("App is listening on port 8080");

// var os = require('os');

// var interfaces = os.networkInterfaces();
// var addresses = [];
// for (var k in interfaces) {
//     for (var k2 in interfaces[k]) {
//         var address = interfaces[k][k2];
//         if (address.family === 'IPv4' && !address.internal) {
//             addresses.push(address.address);
//         }
//     }
// }

// console.log(addresses);