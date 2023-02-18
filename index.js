const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

// Set up Express app
const app = express();

// Set up bodyParser middleware
app.use(bodyParser.json());

// Set up multer middleware to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Define a route for processing voice
app.post('/voice_process', upload.single('voice'), (req, res) => {
  // Set the paths of the input files and the output file
  const inputFile1 = './sounds/ambient.mp3';
  const inputFile2 = req.file.path;
  const outputFile = 'output.mp3';

  // Create a new ffmpeg command
  const command = ffmpeg();

  

  // Add the first input file to the command
  command.input(inputFile1);

  // Add the second input file to the command, and lower its volume by 6dB
  command.input(inputFile2)

  // Use the concat filter to merge the two input files
  command.complexFilter(['amix=inputs=2:duration=first:dropout_transition=3']);

  // Set the output format and file path
  command.outputFormat('mp3').save(outputFile);

  // Run the command and send the output file as a response
  command.on('error', function(err) {
    console.log('An error occurred: ' + err.message);
    res.status(500).send('An error occurred while processing the voice file');
  })
  .on('end', function() {
    console.log('Finished processing');
    res.sendFile(outputFile, { root: __dirname }, function(err) {
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
