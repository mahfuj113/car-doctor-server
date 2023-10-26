const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
// const jwt = require('jsonwebtoken')
// const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

//middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ornkcqn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//create middleware
const logger = async(req,res,next) => {
    // console.log('called',req.host, req.originalUrl);
    // next()
}
const verifyToken = async(req,res,next) => {
    const token = req.cookies?.token
    console.log(token);
    if(!token){
        return res.status(401).send({message:'Unauthorized'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({message:'Unauthorized'})
        }
        console.log("value in decoded",decoded);
        req.user = decoded
        next()
    })
}
// const verifyToken = async(req,res,next) => {
//     const token = req.cookies?.token;
//     console.log('value of token in the middleware',token);
//     if(!token){
//         return res.status(401).send({message:'Unauthorized'})
//     }
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded) => {
//         if(err){
//             return res.status(401).send({message:'Unauthorized'})
//         }
//         console.log('value in the toked decoded',decoded);
//         req.user = decoded
//         next()

//     })
// }
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctor").collection("services")
        const bookingCollection = client.db("carDoctor").collection('bookings')
        //jwt token
        app.post('/jwt',async(req,res) => {
            const user = req.body
            console.log(user);
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
            console.log(token);
            res
            .cookie('token',token,{
                httpOnly: true, 
                secure: false, ////http://localhost:5173/login
            })
            .send({sucess: true})
        })

        //services
        app.get('/services', async (req, res) => {
            const cursor = await serviceCollection.find().toArray()
            res.send(cursor)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await serviceCollection.findOne(query, options)
            res.send(result)
        })

        //bookings
        app.get('/bookings',verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log(req.cookies);
            console.log("User in the valid token",req.user);
            if(req.query.email !== req.user.email){
                return res.status(403).send({message:'forbidden access'})
            }
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updateBooking = req.body
            console.log(updateBooking);
            const updataDoc = {
                $set: {
                    status: updateBooking.status
                }
            }
            const result = await bookingCollection.updateOne(query, updataDoc)
            res.send(result)
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Car doctor server")
})

app.listen(port, () => {
    console.log("car doctor is running on port", port);
})