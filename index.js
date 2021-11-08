const express = require('express')
const { MongoClient } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config()
const admin = require("firebase-admin");


const port = process.env.PORT || 5000;

// doctors-portal-firebase-admin-c1c6f.json 

// Firebase make Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());

//  Start Connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njvzx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

/* ------- Admin verify --------- */
async function verifyToken (req, res, next) {
   if(req.headers?.authorization?.startsWith('Bearer ')) {
     const token = req.headers.authorization.split(' ')[1];

     try{
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedUserEmail = decodedUser.email;

     }
     catch{

     }
   }
  next();
}

// function
async function run(){
 try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

        /*----- database theke user ditails nibo --------*/
    app.get('/appointments', verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      console.log(date);
      const query = {email: email, date: date}
        const cursor = appointmentsCollection.find(query);
        const appointments = await cursor.toArray();
        res.json(appointments);
    })

    /*----------- database e pathacchi-------- */

    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentsCollection.insertOne(appointment);
      console.log(result);
      res.json(result)
    });

    app.get('/users/:email', async (req, res) => {
          const email = req.params.email;
          const query = {email: email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin') {
            isAdmin=true;
          }
          res.json({admin: isAdmin});
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(user);
      res.json(result)
    });

    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = {email: user.email};
      const option = {upsert: true};
      const updateDoc = {$set: user};
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.json(result)
    });
      /*------ make add min with user -----*/
    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedUserEmail;

      if(requester) {
        const requesterAccount = await usersCollection.findOne({email: requester});

        if(requesterAccount.role === 'admin'){
          const filter = {email: user.email};
      const updateDoc = {$set: {role: 'admin'}};
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.json(result);
        }
      }
      else{
        res.status(406).json({message: 'you do not have access to make addmin'});
      }

  
    });
      
    
 }
 finally{
    // await client.close();
 }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Docor portal!')
})

app.listen(port, () => {
  console.log(`Run Successfull ${port}`)
})