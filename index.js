// install on Heroku command line to work:
// heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

// Set up Express app
const app = express();


// AWS DEPENDENCIES
const AWS = require('aws-sdk');
const fs = require('fs');

var storage = multer.diskStorage(
  {
      destination: './uploads/',
      filename: function ( req, file, cb ) {
          //req.body is empty...
          //How could I get the new_file_name property sent from client here?
          cb( null, file.originalname );
      }
  }
);

var upload = multer( { storage: storage } );


// Set up bodyParser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up multer middleware to handle file uploads
app.post('/test', (req, res) => {
  const musicVolume = req.query.musicVolume;
  const inputFile1 = req.query.voicePath;
  const voiceDelay = req.query.voiceDelay;
  console.log([musicVolume, inputFile1, voiceDelay])
  res.send([musicVolume, inputFile1, voiceDelay])
})


// Define a route for processing voice
app.post('/voice_process_url', (req, res) => {
  const mergeMusicUrl = require('./musicMergerFromUrl.js');
  mergeMusicUrl.mergeUrl(req, res);
});



app.post('/textToSpeech', upload.single("musicFile"), (req, res) => {

  // voice params
  let text = req.query.text
  let voice = req.query.voice

  console.log(voice, ' speaking')

  // music params
  //const voicePath = req.query.voicePath;
  const musicPath = req.file.path;
  const voiceDelay = req.query.voiceDelay;
  const musicVolume = req.query.musicVolume;

  const polly = new AWS.Polly({
    accessKeyId: 'AKIAR67OLQ2CTEM4P2XK',
    secretAccessKey: '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',
    region: 'us-east-1'
  }); // instantiate an AWS Polly client

  const params = {
    Engine: "neural",
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voice
  }; // set parameters for Polly to generate an MP3 output

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

          // res.sendFile(__dirname + '/speech.mp3');
          const mergeFiles = require('./mergeFiles.js');
          const voicePath = __dirname + '/speech.mp3'
          await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume);

          // delete files when finished 
          setTimeout(() => {
            fs.unlink(voicePath, (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log('Voice File deleted successfully');
            });

            fs.unlink(musicPath, (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log('Music file deleted successfully');
            });
          }, 9000);
        }
      });
    }
  });
});






// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});

