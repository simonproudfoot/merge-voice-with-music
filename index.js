require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
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
    const file = req.file;

    const uniqueId = Math.floor(Math.random() * 1000000);
    const modifiedFileName = `music_${uniqueId}.mp3`;

    const storageRef = ref(storage, modifiedFileName);
    await uploadBytes(storageRef, file.buffer);

    const fileUrl = `gs://${storage.bucket}/${modifiedFileName}`;
    const musicPath = await getDownloadURL(storageRef, fileUrl);

    await processVoice(req, musicPath);

    res.status(200).send('Received. Please wait for your file to be processed');
  } catch (err) {
    console.log(err);
    res.status(500).send('An error occurred while processing and saving the file to Firebase Storage');
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
