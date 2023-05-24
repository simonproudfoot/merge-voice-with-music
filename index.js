require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { getStorage, ref, uploadBytes, getDownloadURL, getMetadata } = require('firebase/storage');

const { app } = require('./firebase/config');
const processVoice = require('./processVoice');

const server = express();
server.use(cors({ origin: '*' }));

const storage = getStorage(app);

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.post('/text_with_music', uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.query.text) {
      res.status(400).send('Missing "text" param');
      return;
    }
    if (!req.query.voice) {
      res.status(400).send('Missing "voice" param');
      return;
    }
    if (!req.query.userEmail) {
      res.status(400).send('Missing "userEmail" param');
      return;
    }

    const uniqueId = Math.floor(Math.random() * 1000000);
    const userEmail = req.query.userEmail;
     processVoice(req, uniqueId); // Await the completion of processVoice

    const downloadToken = uniqueId; // Replace with the actual download token if required
    const downloadUrl = createPersistentDownloadUrl(process.env['FIREBASE_STORAGE_BUCKET'], `${userEmail}/output_${uniqueId}.mp3`, downloadToken);

    res.status(200).json({ fileStatus: 'processing', url: downloadUrl });
  } catch (err) {
    console.log(err);
    res.status(500).send('An error occurred while processing and saving the file to Firebase Storage');
  }
});



const createPersistentDownloadUrl = (bucket, pathToFile, downloadToken) => {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    pathToFile
  )}?alt=media&token=${downloadToken}`;
};


server.get('/get_file', async (req, res) => {
  const { id, userEmail } = req.query;
  const filePath = `${userEmail}/output_${id}.mp3`;

  try {
    // Get a reference to the Firebase Storage bucket
    const storage = getStorage(app);

    // Create a reference to the file in Firebase Storage
    const fileRef = ref(storage, filePath);

    // Check if the file exists
    const metadata = await getMetadata(fileRef);

    // If the file exists, return it in the response
    const downloadURL = await getDownloadURL(fileRef);
    res.json({ fileStatus: "Ready", url: downloadURL });
  } catch (error) {
    // File does not exist
    res.json({ fileStatus: "Not ready" });
  }
})

server.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
