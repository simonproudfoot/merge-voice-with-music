const fs = require('fs');
const path = require('path');
const mergeFiles = require('./mergeFiles.js');
const uuid = require('uuid');
const axios = require('axios');
const { pipeline } = require('node:stream/promises');

async function processVoice(req, res) {
    try {
        const storageDirectory = path.join(__dirname, 'storage');

        const text = req.query.text;
        const voiceName = req.query.voice;
        const voiceDelay = !req.query.voiceDelay ? 0 : req.query.voiceDelay;
        const musicVolume = !req.query.musicVolume ? 1 : req.query.musicVolume;
        const loopMusic = !req.query.loopMusic ? false : req.query.loopMusic == 'true' ? true : false;

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
            console.log('voice not found!')
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
        const response = await axios.post(url, data, { headers, responseType: 'stream' });
        const uniqueId = uuid.v4();
        const storageFilePath = path.join(storageDirectory, `speech_${uniqueId}.mp3`);
        const writeStream = fs.createWriteStream(storageFilePath);
        await pipeline(response.data, writeStream);

        const voicePath = storageFilePath;


        if (!req.file || req.file == undefined || req.file == null || req.file == '') {
            const savedFilePath = path.join(storageDirectory, `final_${uniqueId}.mp3`);
            fs.rename(voicePath, savedFilePath, (err) => {
                if (err) {
                    console.log('An error occurred while saving the file:', err);
                
                } else {
                    console.log('File saved successfully:', savedFilePath);
                
                }
            });
        } else {
            const musicPath = req.file.path;
            await mergeFiles.mergeFiles(voicePath, musicPath, voiceDelay, musicVolume, loopMusic);
        }
    } catch (err) {
        console.log(err);

    }
}

module.exports = processVoice;
