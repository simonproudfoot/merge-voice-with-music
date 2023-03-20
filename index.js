const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

// Set up Express app
const app = express();

// Set up bodyParser middleware
app.use(bodyParser.json());

// Set up multer middleware to handle file uploads

// Define a route for processing voice
app.post('/voice_process', (req, res) => {
  console.log('connected')
  console.log(req.query.voicePath)

  // Set the paths of the input files and the output file
  const musicVolume = req.query.musicVolume;
  const inputFile1 = req.query.voicePath;
  const voiceDelay = req.query.voiceDelay;
  const inputFile2 = './sounds/news.mp3';
  const outputFile = 'output.mp3';

  // Create a new ffmpeg command
  const command = ffmpeg();

  // Add the first input file to the command
  command.input(inputFile1);

  // Add the second input file to the command, and lower its volume by 6dB
  command.input(inputFile2)

  // Use the concat filter to merge the two input files
  command.complexFilter([
    {
      filter: 'volume',
      options: ['1.0'],
      inputs: "0:0",
      outputs: "[s1]"
    },
    {
      filter: 'volume',
      options: [musicVolume],
      inputs: "1:0",
      outputs: "[s2]"
    },
    {
      filter: "adelay",
      inputs: "[s1]",
      options: [voiceDelay + "s"],
      outputs: "[s1]"
    },
    
    // {
    //   filter: "aloop",
    //   inputs: "[s2]",
    //   options: ["loop=-1:size=1"],
    //   outputs: "[s2]"
    // },

    {
      filter: 'amix',
      inputs: ["[s1]", "[s2]"],
      options: ['duration=first', 'dropout_transition=0']
    }])

  // Set the output format and file path
  command.outputFormat('mp3').save(outputFile);

  // Run the command and send the output file as a response
  command.on('error', function (err) {
    console.log('An error occurred: ' + err.message);
    res.status(500).send('An error occurred while processing the voice file');
  })
    .on('end', function () {
      console.log('Finished processing');
      res.sendFile(outputFile, { root: __dirname }, (err) => {
        if (err) {
          console.log('An error occurred while sending the file: ' + err.message);
          res.status(500).send('An error occurred while sending the file');
        } else {
          console.log('File sent successfully');
        }
      });
    });
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
