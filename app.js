const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require("morgan"); 
const apicache = require("apicache"); 

const app = express();

app.use(morgan('dev')); 
  
//configure apicache  
let cache = apicache.middleware 
  
//caching all routes for 5 minutes 
app.use(cache('30 seconds')) 

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
mongoose.connect('mongodb+srv://Pratiksha2000:Pratiksha2000@cluster0.sgy5ilc.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
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
    wpimg:String,
    pdfUrl: String,
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

// API endpoint to get all files
app.get('/data', async (req, res) => {
    try {
        const files = await File.find();
        res.json(files);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/submit', upload.single('file'), async (req, res) => {
    try {
        

        const { summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain,wpimg, Categories, jobtitle,pdfUrl } = req.body;
        

        // Log the file details
        console.log('File details:', {
            summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain,wpimg, Categories, jobtitle,pdfUrl 
        });

        const newFile = new File({
            summarizedContent, campaignId, campaignName, uniqueId, whitepaperHeading, imagedomain,wpimg, Categories, jobtitle, pdfUrl
        });

        // Save the file details to the database
        await newFile.save();

        res.json({ message: 'File uploaded successfully', file: newFile });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).send('Server error');
    }
});


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
app.delete('/data/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const deletedData = await File.findByIdAndDelete(id);
      if (!deletedData) {
        return res.status(404).json({ message: 'Data not found' });
      }
      res.json({ message: 'Data deleted successfully', deletedData });
    } catch (error) {
      console.error('Error deleting data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


 // update data by id
app.put('/data/:id',async (req,res)=>{
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
  }) 


 // get data by campaign name
 app.get('/data/campaign/:campaignName', async (req, res) => {
    try {
        const campaignName = req.params.campaignName;
        const data = await File.find({campaignName: campaignName });
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
      const data = await File.find({ Categories: Categories });
      const total = data.length
      res.json({total,data});
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
  
  
  // det data by jobtitle
  app.get('/data/jt/:jobtitle',async (req,res)=>{
    try {
      const jobtitle = req.params.jobtitle
      const data = await File.find({ jobtitle: jobtitle });
      const total = data.length
      res.json({ total, data });
      console.log("total jt:",total);
     
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

