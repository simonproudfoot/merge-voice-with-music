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

    const uniqueId = Math.floor(Math.random() * 1000000); // ID for all files


    const file = req.file;


    const modifiedFileName = `music_${uniqueId}.mp3`;

    const userEmail = req.query.userEmail;
    const storageRef = ref(storage, `${userEmail}/${modifiedFileName}`);
    await uploadBytes(storageRef, file.buffer);

    const fileUrl = await getDownloadURL(storageRef);

    await processVoice(req, fileUrl, uniqueId);
   
    res.status(200).json({ proccessing: uniqueId })

  } catch (err) {
    console.log(err);
    res.status(500).send('An error occurred while processing and saving the file to Firebase Storage');
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
