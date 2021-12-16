const express = require('express');
const app = express();
const logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const { response } = require('express');
const { MongoClient, MongoRuntimeError } = require('mongodb');
const bcrypt=require('bcryptjs')
const jwt = require("jsonwebtoken");


app.use(bodyParser.urlencoded({ extended: false })); //parses url encoded bodies
app.use(bodyParser.json()); // semd json repsonses
app.use(logger('dev')); // log request to api using morgan
app.use(cors());

require('dotenv').config();

// Listen

app.listen(8080);
console.log("App is listening on port 8080");

//db

const client = new MongoClient(process.env.MONGO_URI);


app.post('/api/login', async function (req, res) {

  let response;

  try {
    await client.connect();

    const db = client.db('Iot');
    const users = db.collection("Users");
    // console.log(req.body)
    const query = { "email": req.body.email }

    const user = await users.findOne(query);

    if (user == null) {
      //console.log("User does not exist");
      response = { status: "failure", reason: "email" };
      res.json(response);
    }
    else {
      const comparison = await bcrypt.compare(req.body.password, user.password );

    if (!comparison) {
      // console.log(user.password, req.body.password);
      response = { status: "failure", reason: "password" };
      res.json(response);
    }
    else {
      response = { email: req.body.email };
      let token = jwt.sign(response,process.env.JWT_KEY)
      res.json({token});
    }
  }
    //console.log(user==null);
  }
  finally {
    await client.close();
  }

})


app.post('/api/signup', async function (req, res) {

  let response;
  try {
    await client.connect();

    const db = client.db('Iot');
    const users = db.collection("Users");

    const query = { "email": req.body.email }

    const user = await users.findOne(query);
    client.close()

    if (user != null) {
      response = { status: "failure", reason: "email" };
      res.json(response);

    }
    else {
      await client.connect();

      const db = client.db('Iot');
      const users = db.collection("Users");
   
      let hashedPassword = await bcrypt.hash(req.body.password,8)

      newuser = { "email": req.body.email, "password": hashedPassword, "name": { "firsname": req.body.firsname, "lastname": req.body.lastname } };

      var insertResult = await users.insertOne(newuser)
      console.log(insertResult);


      if (insertResult.acknowledged) {

        res.json({ status: "success" });
        client.close();
      }
      else {
        console.log(err);
        res.json({ status: "failure", reason: "500" });
        client.close();
      }

      // var insertResult = users.insertOne(newuser, function(err,res){
      //   console.log(res)
      //   if(err)
      //   {
      //     console.log(err);
      //     res.json({status:"failure",reason:"500"});
      //   }
      //   else
      //   {
      //     res.json({status:"success"});
      //     client.close();
      //   }

      // })
    }

  }
  finally {
    await client.close();
  }

})

app.get('/api/loadmap', async function (req, res) {
  //find and send pins within users range
  try {
    await client.connect();

    const db = client.db('Iot');
    const sensorsCollection = db.collection("Sensors");
    // var sensorsNew=[];

    sensorsCollection.find({}).toArray(async function (err, result) {
      if (err) throw err;
      // console.log(result);
      client.close();

      var sensorsNew = [];

      result.forEach(function (sensor) {
        let counter = 0

        for (i = 0; i < 3; i++) {
          if (sensor.timeNStatus[i].status == 0) {
            counter += 1
          }
          else break;
        }
        if (counter == 3) {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "red" });
        }
        else if(counter==2)
        {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "yellow" });

        }
        else {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "green" });
        }
        //console.log(sensorsNew)
        return {
          sensorsNew
        }
      })

      res.json(sensorsNew);
      // console.log(sensorsNew)


    });
    // console.log(sensorsNew)
    // res.json(sensorsNew);


  }
  catch (error) {
    console.log(error)
    res.json({ status: "failure", reason: "500" });
  }

})

app.post('/api/reports', async function (req, res) {
  //Store the reports from the users in the database
  let response;
  
  try {
    await client.connect();

    const db = client.db('Iot');
    const reports = db.collection("Reports");

    var decoded = jwt.decode(req.body.token);
   

    // console.log(decoded.email);
    // console.log(req.body);

    // let email = 

    newReport = { "email": decoded.email, "place":req.body.place,"issue":req.body.issue,"status": "unread-unsolved" };

    var insertResult = await reports.insertOne(newReport)
    console.log(insertResult);
    res.json({ status: "success", reason: "200" });

  }
  finally {
    await client.close();
  }

})

app.post('/api/getReports', async function (req, res) {
  //Store the reports from the users in the database
  let response;
  



  try {
    await client.connect();

    const db = client.db('Iot');
    const reports = db.collection("Reports");




    var decoded = jwt.decode(req.body.token);
    // console.log(req.body)
    const query = { "email": decoded.email }


    // const user = await reports.find(query);
    // console.log(user)
    // console.log(query)

    const rep = await reports.find(query).toArray();
    // console.log(rep)
    res.json(rep);
    // reports.find(query).toArray(async function (err, result) { 

    //   if (err) throw err;
    //   console.log(result)


    //   result.forEach(function (sensor) {
    //     console.log(sensor);
    //    })
    // });

    
    // console.log(query);
    // const allReports = await reports.find(query).toArray(async function (err, result) { 
    //   console.log(result);
    // });

  }
  finally {
    await client.close();
  }

})

app.get('/api/occupiedRamps', async function (req, res) {
  //Access for authorities to see the ramps under occupation 


})


//---------------EXAMPLES------------------------------------

// Routes
app.post('/api/test', function (req, res) {

  console.log(req.body);

  var repsonse = "Received";
  res.json(response);

})


//show db names
// client
//   .connect()
//   .then(client =>
//     client
//       .db()
//       .admin()
//       .listDatabases() // Returns a promise that will resolve to the list of databases
//   )
//   .then(dbs => {
//     console.log("Mongo databases", dbs);
//   })
//   .finally(() => client.close()); // Closing after getting the data



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


async function loginTest() {

  let userphone = 6922222222
  let password = "1234abc"

  try {
    await client.connect();

    const db = client.db('Iot');
    const users = db.collection("User");

    const query = { "phone": userphone }

    const user = await users.findOne(query);

    if (user == null) {
      console.log("User does not exist");
    }
    else if (user.Password != password) {
      console.log("Wrong Password");
    }
    else {
      console.log("Success!");
    }
    //console.log(user==null);
  }
  finally {
    await client.close();
  }


}

async function mapTest() {

  try {
    await client.connect();

    const db = client.db('Iot');
    const sensorsCollection = db.collection("Sensors");
    // var sensorsNew=[];

    sensorsCollection.find({}).toArray(async function (err, result) {
      if (err) throw err;
      // console.log(result);
      client.close();

      var sensorsNew = [];

      result.forEach(function (sensor) {
        let counter = 0

        for (i = 0; i < 3; i++) {
          if (sensor.timeNStatus[i].status == 0) {
            counter += 1
          }
          else break;
        }
        if (counter == 3) {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "occupied" });
        }
        else {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "free" });
        }
        //console.log(sensorsNew)
        return {
          sensorsNew
        }
      })

      // res.json(sensorsNew);
      // console.log(sensorsNew)


    });
    // console.log(sensorsNew)
    // res.json(sensorsNew);


  }
  catch (error) {
    console.log(error)
    res.json({ status: "failure", reason: "500" });
  }


}


// run().catch(console.dir);

//loginTest();

// mapTest();