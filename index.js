// install on Heroku command line to work:
// heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
require('dotenv').config({ path: '.env' })

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

// Set up Express app
const app = express();

// AWS DEPENDENCIES
const AWS = require('aws-sdk');
const fs = require('fs');
const polly = new AWS.Polly({
  accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
  secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
  region: process.env['AWS_REGION']
});

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


app.post('/text_with_music', upload.single("file"), (req, res) => {
  
  if (!req.file || !req.query.voiceDelay || !req.query.musicVolume || !req.query.voice || !req.query.text || req.file == undefined || req.file == null || req.file == '') {
    res.json({ error: 'Params missing' })
    return
  }
  // voice params
  let text = req.query.text
  let voice = req.query.voice

  // music params
  const musicPath = req.file.path;
  const voiceDelay = req.query.voiceDelay;
  const musicVolume = req.query.musicVolume;
  const loopMusic = req.query.loopMusic == 'true' ? true : false

  const params = {
    Engine: "neural",
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voice
  };

  polly.synthesizeSpeech(params, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'Failed to generate speech' });
    } else if (data.AudioStream instanceof Buffer) {
      fs.writeFile('speech.mp3', data.AudioStream, async (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'Failed to save speech file' });
        } else {

          const mergeFiles = require('./mergeFiles.js');
          const voicePath = __dirname + '/speech.mp3'
          await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic);

          // delete files when finished 
          // setTimeout(() => {
          //   fs.unlink(voicePath, (err) => {
          //     if (err) {
          //       console.error(err);
          //       return;
          //     }
          //     console.log('Voice File deleted successfully');
          //   });

          //   fs.unlink(musicPath, (err) => {
          //     if (err) {
          //       console.error(err);
          //       return;
          //     }
          //     console.log('Music file deleted successfully');
          //   });
          // }, 9000);
        }
      });
    }
  });
});

app.get('/get_voices', (req, res) => {
  polly.describeVoices({}, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send(err);
    } else {
      const voices = data.Voices.map((voice) => {
        return {
          name: voice.Name,
          language: voice.LanguageName,
          gender: voice.Gender,
          id: voice.Id,
        };
      });
      res.send(voices);
    }
  });
});

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});

