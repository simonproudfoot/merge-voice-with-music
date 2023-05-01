// install on Heroku command line to work:
// heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
require('dotenv').config({ path: '.env' })

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');

// Set up Express app
const app = express();
app.use(cors({
  origin: '*'
}));

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

  if (!req.query.text) {
    res.json({ error: 'Text param missing' })
    return
  }

  if (!req.query.voice) {
    res.json({ error: 'Voice param missing' })
    return
  }

  // voice params
  let text = req.query.text
  let voice = req.query.voice

  // music params
  const voiceDelay = req.query.voiceDelay;
  const musicVolume = req.query.musicVolume;
  const loopMusic = req.query.loopMusic == 'true' ? true : false

  const params = {
    Engine: "neural",
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voice,
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

          // voice only
          if (!req.file || req.file == undefined || req.file == null || req.file == '') {

            res.sendFile(voicePath, (err) => {
              if (err) {
                console.log('An error occurred while sending the file: ' + err.message);
                res.status(500).send('An error occurred while sending the file');
              } else {
                console.log('File sent successfully');
                return
              }
            });
          } else {
            const musicPath = req.file.path;
            await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic);
          }
        }
      });
    }
  });
});


app.get('/get_voices', (req, res) => {
  const params = {
    Engine: 'neural'
  };
  polly.describeVoices(params, (err, data) => {
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

app.get('/create_voice_samples', (req, res) => {
  const params = {
    Engine: 'neural'
  };
  polly.describeVoices(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      res.status(500).send(err);
    } else {
      const englishVoices = data.Voices.filter((voice) => {
        return voice.LanguageName.includes('English');
      });
      const promises = englishVoices.map((voice) => {
        return new Promise((resolve, reject) => {
          const params = {
            Engine: "neural",
            OutputFormat: 'mp3',
            Text: "Hello. I look forward to sharing your tales of horror and mystery",
            VoiceId: voice.Id,
          };
          polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
              console.log(err);
              reject(err);
            } else if (data.AudioStream instanceof Buffer) {
              const fileName = `${voice.Name.replace(/\s/g, '')}.mp3`;
              const filePath = `./voice_samples/${fileName}`;
              fs.writeFile(filePath, data.AudioStream, (err) => {
                if (err) {
                  console.log(err);
                  reject(err);
                } else {
                  console.log(`${voice.Name} saved successfully`);
                  resolve();
                }
              });
            }
          });
        });
      });
      Promise.all(promises)
        .then(() => {
          res.send('All voices saved successfully');
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
  });
});



// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});



