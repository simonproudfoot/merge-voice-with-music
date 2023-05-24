const fs = require('fs');
const path = require('path');
const mergeFiles = require('./mergeFiles.js');
const uuid = require('uuid');
const axios = require('axios');
const { pipeline } = require('node:stream/promises');
const { app } = require("./firebase/config");
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');


async function processVoice(req, uniqueId) {
  return new Promise(async (resolve, reject) => {
    try {

      const storage = getStorage(app);
      const text = req.query.text;
      const voiceName = req.query.voice;
      const voiceDelay = !req.query.voiceDelay ? 0 : req.query.voiceDelay;
      const musicVolume = !req.query.musicVolume ? 1 : req.query.musicVolume;
      const loopMusic = !req.query.loopMusic ? false : req.query.loopMusic == 'true' ? true : false;

      const file = req.file.buffer; // Access the file buffer
      const modifiedFileName = `music_${uniqueId}.mp3`;
      const storageRef1 = ref(storage, `${req.query.userEmail}/${modifiedFileName}`);
      await uploadBytes(storageRef1, file);
      const musicPath = await getDownloadURL(storageRef1); // Updated line

      const username = '';
      const sourceUrl = '';

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
        console.log('Voice not found!');
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
          "stability": 1,
          "similarity_boost": 1
        }
      };

      console.log('Creating voice');
      const response = await axios.post(url, data, { headers, responseType: 'arraybuffer' });
      const storageFilePath = `${req.query.userEmail}/speech_${uniqueId}.mp3`;
      const storageRef = ref(storage, storageFilePath);
      await uploadBytes(storageRef, response.data);
      const voicePath = await getDownloadURL(storageRef, storageFilePath);
      await mergeFiles.mergeFiles(voicePath, musicPath, voiceDelay, musicVolume, loopMusic, req.query.userEmail, uniqueId);
      resolve();
    } catch (error) {
      console.log('An error occurred:', error.message);
      reject(error); // Reject the Promise if an error occurs
    }
  });


}

module.exports = processVoice;
