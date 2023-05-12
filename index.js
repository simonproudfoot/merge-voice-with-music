app.post('/text_with_music', upload.single("file"), async (req, res) => {
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
        "stability": 0,
        "similarity_boost": 0
      }
    };

    const response = await axios.post(url, data, { headers, responseType: 'stream' });

    response.data.pipe(fs.createWriteStream('speech.mp3'));

    response.data.on('end', async () => {
      const mergeFiles = require('./mergeFiles.js');
      const voicePath = __dirname + '/speech.mp3';

      // Voice only
      if (!req.file || req.file == undefined || req.file == null || req.file == '') {
        res.sendFile(voicePath, (err) => {
          if (err) {
            console.log('An error occurred while sending the file: ' + err.message);
            res.status(500).send('An error occurred while sending the file');
          } else {
            console.log('File sent successfully');
          }
        });
      } else {
        const musicPath = req.file.path;
        await mergeFiles.mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume, loopMusic);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});
