require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const textWithMusic = require('./ai-functions/textWithMusic.js');
const getVoices = require('./ai-functions/getVoices.js');
const createSamples = require('./ai-functions/createSamples.js');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const storageDirectory = path.join(__dirname, 'storage');
    fs.mkdirSync(storageDirectory, { recursive: true });
    cb(null, storageDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueId = Math.floor(Math.random() * 1000000); // Generate a random ID
    const originalFileName = path.parse(file.originalname).name;
    const fileExtension = path.extname(file.originalname);
    const modifiedFileName = `music_${originalFileName}_${uniqueId}${fileExtension}`;
    cb(null, modifiedFileName);
  }
});

var upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PRO VERSION - ELEVEN LABS
app.post('/text_with_music', upload.single('file'), textWithMusic.textWithMusic);
app.get('/get_voices', getVoices.getVoices);
app.get('/create_voice_samples', createSamples.createSamples);


// // BASIC VERSION - AWS
// app.post('/text_with_music', upload.single('file'), textWithMusic.textWithMusic);
// app.get('/get_voices', getVoices.getVoices);
// app.get('/create_voice_samples', createSamples.createSamples);


app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
