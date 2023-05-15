const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

exports.createSamples = async (req, res) => {
  try {
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env['ELEVENLABS_API_KEY'],
        'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
        'accept': 'application/json',
      }
    });

    const voices = voicesResponse.data.voices;
    const folderPath = './pro_voice_samples';

    // Check if the folder exists, create it if necessary
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    for (const voice of voices) {
      const voiceId = voice.voice_id;
      const voiceName = voice.name;
      const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
      const headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env['ELEVENLABS_API_KEY'],
      };

      const data = {
        "text": "hello, I'm " + voiceName + ". I look forward to sharing your tales of horror and mystery!",
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
          "stability": 0,
          "similarity_boost": 0
        }
      };

      const response = await axios.post(url, data, { headers, responseType: 'stream' });
      const filePath = `${folderPath}/${voiceName}.mp3`;

      await pipeline(response.data, fs.createWriteStream(filePath));
    }

    res.send('Voice samples created successfully.');
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to create voice samples' });
  }
};
