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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
});

require('dotenv').config();

// Listen
// app.listen(8080);

//for real server
app.listen(80);
console.log("App is listening on port 80");

//db

const client = new MongoClient(process.env.MONGO_URI);


app.post('/api/login', async function (req, res) {

  let response;

  try {
    await client.connect();

    const db = client.db('Iot');
    const users = db.collection("Users");
    const query = { "email": req.body.email }
    const user = await users.findOne(query);

    if (user == null) {
      response = { status: "failure", reason: "email" };
      res.json(response);
    }
    else {
      const comparison = await bcrypt.compare(req.body.password, user.password );

    if (!comparison) {
      response = { status: "failure", reason: "password" };
      res.json(response);
    }
    else {
      response = { email: req.body.email };
      let token = jwt.sign(response,process.env.JWT_KEY)
      res.json({token});
    }
  }

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


      if (insertResult.acknowledged) {
        res.json({ status: "success" });
        client.close();
      }
      else {
        console.log(err);
        res.json({ status: "failure", reason: "500" });
        client.close();
      }
    }

  }
  finally {
    await client.close();
  }

})

app.get('/api/loadmap', async function (req, res) {

  try {
    await client.connect();
    const db = client.db('Iot');
    const sensorsCollection = db.collection("Sensors");
    sensorsCollection.find({}).toArray(async function (err, result) {

      if (err) throw err;
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
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "red","id":sensor._id });
        }
        else if(counter==2)
        {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "yellow","id":sensor._id });
        }
        else {
          sensorsNew.push({ "type": sensor.type, "location": sensor.location, "status": "green","id":sensor._id });
        }

        return {
          sensorsNew
        }
      })

      await client.connect();

      const db = client.db('Iot');
      const sensorsCollection = db.collection("realSensors");
      sensorsCollection.find({}).toArray(async function (err, result) { 
      
        var currentdate = new Date();
        result.forEach(function(sensor){

          let lastEntryNum = sensor.entries.length;
          
          let sensorStatus = sensor.entries[lastEntryNum-1].status;

          if(sensorStatus==1)
          {
            sensorsNew.push({"type": "r", "location": sensor.location, "status": "green","id": sensor.DevId })
          }
          else
          {
            sensorTimestamp = sensor.entries[lastEntryNum-1].timestamp;
            let sensorTimestampDate = new Date(sensorTimestamp);
            let timeDif = timeDifference(currentdate,sensorTimestampDate);

            if(timeDif>120)
            {
              sensorsNew.push({"type": "r", "location": sensor.location, "status": "red","id": sensor.DevId })
            }
            else{
              sensorsNew.push({"type": "r", "location": sensor.location, "status": "yellow","id": sensor.DevId })
            }
            
          }
        })

        res.json(sensorsNew);

      })

    });


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

    newReport = { "email": decoded.email, "place":req.body.place,"issue":req.body.issue,"status": "unread-unsolved" };

    var insertResult = await reports.insertOne(newReport)
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
    const query = { "email": decoded.email }
    const rep = await reports.find(query).toArray();


    res.json(rep);

  }
  finally {
    await client.close();
  }

})

app.get('/api/occupiedRamps', async function (req, res) {
  //Access for authorities to see the ramps under occupation 


})

app.post('/api/sensordata', async function (req, res) {
  let response;

  try {
    await client.connect();

    const db = client.db('Iot');
    const sensors = db.collection("realSensors");
    let sensorDetails = JSON.parse(req.body.objectJSON)
    let devID =  req.body.devEUI;

    const searchQuery = { "DevId": devID }
    const sensor = await sensors.findOne(searchQuery);
    client.close();

    
    if (sensor == null) {
      await client.connect();
      const db = client.db('Iot');
      const sensors = db.collection("realSensors");

      let newEntry = {"DevId": req.body.devEUI,"location": {"latitude": req.body.rxInfo[0].location.latitude, "longitude": req.body.rxInfo[0].location.longitude},"entries":[ {"timestamp": req.body.rxInfo[0].time, "status": sensorDetails.carStatus, "battery": sensorDetails.batteryVoltage}]}
      console.log("Inserting the below json in db")
      console.log(newEntry);

      var insertResult = await sensors.insertOne(newEntry)
      console.log("insert result below");
      console.log(insertResult);

      res.json({ status: "success", reason: "200" });
      client.close()
    }
    else{
      await client.connect();
      const db = client.db('Iot');
      const sensors = db.collection("realSensors");

      let newEntry = {"timestamp": req.body.rxInfo[0].time, "status": sensorDetails.carStatus, "battery": sensorDetails.batteryVoltage}
      console.log("Updating with the below json in db")
      console.log(newEntry);
      
      var updateResult = await sensors.updateOne({ "DevId": devID },{ $push: { entries: newEntry } })
      console.log("update result below");
      console.log(updateResult);

      res.json({ status: "success", reason: "200" });
      client.close()
    }
  }
  finally {
    await client.close();
  }

})


app.get('/api/image_issue', function (req, res) {
	let _bugImg = req.query.bug_id;
  console.log(req.query)
	if (_bugImg != undefined) {

      let picURL = 	"./"+ "/Pictures/" +_bugImg + ".png";	
			if (res) {
        res.type('png').sendFile(picURL, { root: '.' }, function (err){
          if (err) {
            console.log(err)
          } else {
            console.log("response sent!")
          }
        });
			}
			else {
				console.log("Not found!");
				res.status(404).send('Not found');
			}
	
	} else {
		console.log("Not found!!");
		res.status(404).send('Not found');
	}
});



function timeDifference(date1,date2) {
  var difference = date1.getTime() - date2.getTime();

  var daysDifference = Math.floor(difference/1000/60/60/24);
  difference -= daysDifference*1000*60*60*24

  var hoursDifference = Math.floor(difference/1000/60/60);
  difference -= hoursDifference*1000*60*60

  var minutesDifference = Math.floor(difference/1000/60);
  difference -= minutesDifference*1000*60

  var secondsDifference = Math.floor(difference/1000);

  // console.log('difference = ' + 
  //   daysDifference + ' day/s ' + 
  //   hoursDifference + ' hour/s ' + 
  //   minutesDifference + ' minute/s ' + 
  //   secondsDifference + ' second/s ');
  // console.log(Math.abs(daysDifference*24*60*60)+Math.abs(hoursDifference*60*60)+Math.abs(minutesDifference*60)+Math.abs(secondsDifference))
  return (Math.abs(daysDifference*24*60*60)+Math.abs(hoursDifference*60*60)+Math.abs(minutesDifference*60)+Math.abs(secondsDifference))
}
