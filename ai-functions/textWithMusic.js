const axios = require('axios');
const fs = require('fs');
const { pipeline } = require('node:stream/promises');
const uuid = require('uuid');
const deleteOldFiles = require('../deleteOldFiles');
const path = require('path');
exports.textWithMusic = async (req, res) => {
    req.setTimeout(300000);
    // Get the storage directory path
    const storageDirectory = path.join(__dirname, '..', 'storage');
    // Delete files older than 10 minutes
    deleteOldFiles(storageDirectory);

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
    // Music params
    const voiceDelay = !req.query.voiceDelay ? 0 : req.query.voiceDelay;
    const musicVolume = !req.query.musicVolume ? 1 : req.query.musicVolume;
    const loopMusic = !req.query.loopMusic ? false : req.query.loopMusic == 'true' ? true : false;
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
                "stability": 1,
                "similarity_boost": 1
            }
        };
        const response = await axios.post(url, data, { headers, responseType: 'stream' });
        const storageDirectory = __dirname + '/../storage';
        fs.mkdirSync(storageDirectory, { recursive: true });
        const uniqueId = uuid.v4();
        const storageFilePath = storageDirectory + '/speech_' + uniqueId + '.mp3';
        const writeStream = fs.createWriteStream(storageFilePath);
        await pipeline(response.data, writeStream);
        //await pipeline(response.data, fs.createWriteStream(storageFilePath));
        const mergeFiles = require('../mergeFiles.js');
        const voicePath = storageFilePath;
        if (!req.file || req.file == undefined || req.file == null || req.file == '') {
            res.sendFile(voicePath, (err) => {
                if (err) {
                    console.log('An error occurred while sending the file: ' + err.message);
                    res.status(500).send('An error occurred while sending the file');
                } else {
                    console.log('File sent successfully');
                    fs.unlink(voicePath, (err) => {
                        if (err) {
                            console.log('An error occurred while deleting the file: ' + err.message);
                        } else {
                            console.log('Temporary file deleted');
                        }
                    });
                }
            });
        } else {
            const musicPath = req.file.path;
            await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic);
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
};