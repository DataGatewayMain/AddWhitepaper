const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require("morgan"); 
const apicache = require("apicache");
const { createClient } = require('redis');

const app = express();

app.use(morgan('dev'));

// Create a Redis client
const redisClient = createClient({
    url: 'redis://:db3M7JfjTDzQW3zFDn16LHl6wzz7yNKI@redis-13790.c323.us-east-1-2.ec2.redns.redis-cloud.com:13790'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

async function initializeRedis() {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Could not connect to Redis...', err);
    }
}

// Configure apicache to use Redis
const cache = apicache.options({
    redisClient: redisClient
}).middleware;

//caching all routes for 3 minutes 
app.use(cache('3 seconds')) 

app.use(express.json())
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(bodyParser.urlencoded({ extended: true }));

const axios = require('axios');

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// MongoDB connection
mongoose.connect('mongodb+srv://arpita:4fDFJGcJctgrxtUb@cluster0.blwbjdl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10 // Adjust the pool size as needed
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB...', err);
});


// Define a schema and model for the uploaded files
const fileSchema = new mongoose.Schema({
    summarizedContent: String,
    campaignId: String,
    campaignName: String,
    uniqueId: String,
    whitepaperHeading: String,
    imagedomain: String,
    Categories:String,
    jobtitle:String,
    subjobtitle:String,
    wpimg:String,
    pdfUrl: String,
    privacylink:String,
    faviconurl:String,
    que1:String,
    que2:String,
    que3:String,
    que4:String,
    que5:String,
    que6:String,
});

const File = mongoose.model('File', fileSchema);

// Set up Multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


// Middleware to invalidate cache for specific routes
const invalidateCache = async (req, res, next) => {
    try {
        await redisClient.del('files');
        next();
    } catch (err) {
        console.error('Error invalidating cache:', err);
        next(err);
    }
};


// Route to get data from MongoDB, with Redis caching
app.get('/data', async (req, res) => {
    try {
        // Check if data exists in Redis cache
        const files = await redisClient.get('files');

        if (files) {
            // Data exists in cache, return cached data
            return res.json(JSON.parse(files));
        } else {
            // Data doesn't exist in cache, fetch from MongoDB
            const filesFromDB = await File.find().sort({ _id: -1 });
           
            // Store fetched data in Redis cache
            await redisClient.setEx('files', 3600, JSON.stringify(filesFromDB));
            // Return fetched data
            return res.json(filesFromDB);
          
        }
    
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Server error');
    }
});

// Route to upload a file and save details to MongoDB
app.post('/submit', invalidateCache, async (req, res) => {
    try {
        const { summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain, wpimg, Categories, jobtitle, pdfUrl, privacylink,subjobtitle, que1, que2,que3,que4,que5,que6 } = req.body;
        // Log the file details
        console.log('File details:', {
            summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain, wpimg, Categories, jobtitle, pdfUrl, privacylink,subjobtitle, que1, que2,que3,que4,que5,que6
        });

        const newFile = new File({
            summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain, wpimg, Categories, jobtitle, pdfUrl, privacylink,subjobtitle, que1, que2,que3,que4,que5,que6
        });

        // Save the file details to the database
        await newFile.save();

     
        res.json({ message: 'File uploaded successfully', file: newFile });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).send('Server error');
    }
});

// end redis

    // Endpoint to get a file by ID
    app.get('/data/:id', async (req, res) => {
        try {
            const fileId = req.params.id;
            console.log(`Fetching file with ID: ${fileId}`);

            const file = await File.findById(fileId);
            
            if (!file) {
                return res.status(404).send('File not found');
            }

            res.json(file);
        } catch (err) {
            console.error(err.message);
            
            // If the error is due to an invalid ObjectId, handle it
            if (err.kind === 'ObjectId') {
                return res.status(400).send('Invalid file ID');
            }
            
            res.status(500).send('Server error');
        }
    });

  
    // Delete data by ID
    app.delete('/data/:id',invalidateCache, async (req, res) => {
        try {
            const fileId = req.params.id;

            // Delete the data from MongoDB
            const result = await File.findByIdAndDelete(fileId);

            if (!result) {
                return res.status(404).send('File not found');
            }

            res.send('File deleted successfully');
        } catch (err) {
            console.error('Error deleting data:', err);
            res.status(500).send('Server error');
        }
    });


    // update data by id
    app.put('/data/:id',invalidateCache,async (req,res)=>{
        try {
        const id = req.params.id;
        const newData = req.body; // Updated data
        const updatedData = await File.findByIdAndUpdate(id, newData, { new: true });
        if (!updatedData) {
            return res.status(404).json({ message: 'Data not found' });
        }
        res.json(updatedData);
        } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).json({ message: 'Internal server error' });
        }
    });


    // get data by campaign name
    app.get('/data/campaign/:campaignName', async (req, res) => {
        try {
            const campaignName = req.params.campaignName;
            const data = await File.find({campaignName: campaignName }).sort({ _id: -1 });
            console.log("The Data Is:",data);
            res.json(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });


    // get data by category name
    app.get('/data/cat/:Categories',async (req,res)=>{
    try {
      const Categories = req.params.Categories;
      const data = await File.find({ Categories: Categories }).sort({ _id: -1 });
      const total = data.length
      res.json({total,data});
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
    });
  

  // det data by jobtitle
  app.get('/data/jt/:jobtitle',async (req,res)=>{
    try {
      const jobtitle = req.params.jobtitle
      const data = await File.find({ jobtitle: jobtitle }).sort({ _id: -1 });
      const total = data.length
      res.json({ total, data });
      console.log("total jt:",total);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});


// get data by subjobtitle
app.get('/data/sjt/:subjobtitle',async (req,res)=>{
    try {
      const subjobtitle = req.params.subjobtitle
      const data = await File.find({ subjobtitle: subjobtitle }).sort({ _id: -1 });
      const total = data.length
      res.json({ total, data });
      console.log("total jt:",total);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

 
        // Start the server
        const port = process.env.PORT || 3000;
        app.listen(port, async () => {
        await initializeRedis();
        console.log(`Server started on port ${port}`);
        });

