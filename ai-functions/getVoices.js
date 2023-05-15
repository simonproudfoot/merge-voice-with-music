
const axios = require('axios');

exports.getVoices = async (req, res) => {
    try {
        const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': process.env['ELEVENLABS_API_KEY'],
                'X-Api-Key': process.env['ELEVENLABS_API_KEY'],
                'accept': 'application/json',
            }
        });


        const voices = response.data.voices.map((voice) => ({

            name: voice.name,
            language: 'English',
            gender: 'male',
            id: voice.voice_id,
        }));

        res.send(voices);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to retrieve voices' });
    }
};
