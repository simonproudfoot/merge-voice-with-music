// install on Heroku command line to work:
// heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
require('dotenv').config({ path: '.env' })

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');

// Set up Express app
const app = express();
app.use(cors({
  origin: '*'
}));

// AWS DEPENDENCIES

const fs = require('fs');


var storage = multer.diskStorage(
  {
    destination: './uploads/',
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  }
);

var upload = multer({ storage: storage });

// Set up bodyParser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Define a route for processing voice only
app.post('/voice_process_url', (req, res) => {
  const mergeMusicUrl = require('./musicMergerFromUrl.js');
  mergeMusicUrl.mergeUrl(req, res);
});

app.post('/text_with_music', upload.single("file"), async (req, res) => {
  if (!req.query.text) {
    res.json({ error: 'Text param missing' });
    return;
  }

  if (!req.query.voice) {
    res.json({ error: 'Voice param missing' });
    return;
  }

  // Voice params
  const text = req.query.text;
  const voice = req.query.voice;

  // Music params
  const voiceDelay = !req.query.voiceDelay ? 0 : req.query.voiceDelay;
  const musicVolume = !req.query.musicVolume ? 1 : req.query.musicVolume;
  const loopMusic = !req.query.loopMusic ? false : req.query.loopMusic == 'true' ? true : false;

  const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voice;
  const headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": process.env['ELEVENLABS_API_KEY'],
  };

  const data = {
    "text": text,
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
      "stability": 0,
      "similarity_boost": 0
    }
  };

  try {
    const response = await axios.post(url, data, { headers, responseType: 'stream' });

    response.data.pipe(fs.createWriteStream('speech.mp3'));

    response.data.on('end', async () => {
      const mergeFiles = require('./mergeFiles.js');
      const voicePath = __dirname + '/speech.mp3';

      // Voice only
      if (!req.file || req.file == undefined || req.file == null || req.file == '') {
        res.sendFile(voicePath, (err) => {
          if (err) {
            console.log('An error occurred while sending the file: ' + err.message);
            res.status(500).send('An error occurred while sending the file');
          } else {
            console.log('File sent successfully');
          }
        });
      } else {
        const musicPath = req.file.path;
        await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

app.get('/get_voices', async (req, res) => {
  try {

    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env['ELEVENLABS_API_KEY'],
        'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
        'accept': 'application/json',
      }
    });

    const voices = response.data.voices.map((voice) => ({

      name: voice.name,
      language: 'English',
      gender: 'male',
      id: voice.voice_id,

    }));

    res.send(voices);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
});


app.get('/create_voice_samples', async (req, res) => {
  try {
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env['ELEVENLABS_API_KEY'],
        'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
        'accept': 'application/json',
      }
    });

    const voices = voicesResponse.data.voices;

    for (const voice of voices) {
      const voiceId = voice.voice_id;
      const voiceName = voice.name;

      const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
      const headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env['ELEVENLABS_API_KEY'],
      };

      const data = {
        "text": "hello, I'm " + voiceName + ". I look forward to sharing your tales of horror and mystery!",
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
          "stability": 0,
          "similarity_boost": 0
        }
      };

      const response = await axios.post(url, data, { headers, responseType: 'stream' });
      const filePath = `./voice_samples/${voiceName}.mp3`;

      response.data.pipe(fs.createWriteStream(filePath));
    }

    res.send('Voice samples created successfully.');
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to create voice samples' });
  }
});




// Start the server
app.listen(process.env.PORT || 8080, () => {
  console.log('Server started');
});
