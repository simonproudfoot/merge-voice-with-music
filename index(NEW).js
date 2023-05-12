// install on Heroku command line to work:
// heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
require('dotenv').config({ path: '.env' })

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

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
  const voiceName = req.query.voice;
  const voiceDelay = req.query.voiceDelay || 0;
  const musicVolume = req.query.musicVolume || 1;
  const loopMusic = req.query.loopMusic === 'true';

  try {
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env['ELEVENLABS_API_KEY'],
        'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
        'accept': 'application/json',
      }
    });

    const voices = voicesResponse.data.voices;
    const foundVoice = voices.find((voice) => voice.name === voiceName);

    if (!foundVoice) {
      res.status(404).json({ error: 'Voice not found' });
      return;
    }

    const voiceId = foundVoice.voice_id;
    const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
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

    const response = await axios.post(url, data, { headers, responseType: 'arraybuffer' });

    const outputPath = 'speech.mp3';
    const outputStream = fs.createWriteStream(outputPath);

    response.data.pipe(outputStream);

    response.data.on('end', async () => {
      outputStream.close();

      // Convert the output file to a lower bit rate MP3 format
      await new Promise((resolve, reject) => {
        ffmpeg(outputPath)
          .outputOptions('-b:a', '64k')  // Set the desired bit rate (64kbps in this example)
          .format('mp3')
          .on('error', (err) => {
            console.error('An error occurred while converting the file:', err);
            reject(err);
          })
          .on('end', async ()  => {
            const mergeFiles = require('./mergeFiles.js');
            const voicePath = __dirname + '/' + outputPath;

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

            resolve();
          })
          .save(outputPath);
      });
    });
  }  catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
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
  const voiceName = req.query.voice;
  const voiceDelay = req.query.voiceDelay || 0;
  const musicVolume = req.query.musicVolume || 1;
  const loopMusic = req.query.loopMusic === 'true';

  try {
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env['ELEVENLABS_API_KEY'],
        'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
        'accept': 'application/json',
      }
    });

    const voices = voicesResponse.data.voices;
    const foundVoice = voices.find((voice) => voice.name === voiceName);

    if (!foundVoice) {
      res.status(404).json({ error: 'Voice not found' });
      return;
    }

    const voiceId = foundVoice.voice_id;
    const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
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

    const response = await axios.post(url, data, { headers, responseType: 'arraybuffer' });

    const outputPath = 'speech.mp3';
    fs.writeFileSync(outputPath, response.data);

    // Convert the output file to a lower bit rate MP3 format
    ffmpeg(outputPath)
      .outputOptions('-b:a', '64k')  // Set the desired bit rate (64kbps in this example)
      .format('mp3')
      .on('error', (err) => {
        console.error('An error occurred while converting the file:', err);
        res.status(500).json({ error: 'Failed to generate speech' });
      })
      .on('end', () => {
        const mergeFiles = require('./mergeFiles.js');
        const voicePath = __dirname + '/' + outputPath;

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
          mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic)
            .catch((err) => {

              console.error('An error occurred during file merging:', err);
              res.status(500).json({ error: 'Failed to merge files' });
            });
        }
      })
      .save(outputPath);
  } catch (err) {
    console.error(err);
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

    console.log(response.data.voices);

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





// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
