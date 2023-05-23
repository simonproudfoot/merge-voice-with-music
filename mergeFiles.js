const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { app } = require("./firebase/config");
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

async function mergeFiles(voicePath, musicPath, voiceDelay, musicVolume, loopMusic, userEmail, uniqueId) {
    const outputFile = `output_${uniqueId}.mp3`;
    let audioFileDetails = await getSampleSize(musicPath);
    let voiceFileDetails = await getSampleSize(voicePath);
    let voiceLength = voiceFileDetails.streams[0].duration;

    const command = ffmpeg();
    // Add the voice file
    command.input(voicePath);
    // Add the music file
    command.input(musicPath);
    // run filters
    command.complexFilter([
        {
            filter: 'volume',
            options: ['1.0'],
            inputs: "0:0",
            outputs: "[s1]"
        },
        {
            filter: 'volume',
            options: [musicVolume],
            inputs: "1:0",
            outputs: "[s2]"
        },
        {
            filter: "adelay",
            inputs: "[s1]",
            options: [voiceDelay + "s"],
            outputs: "[s1]"
        },
        {
            filter: 'aloop',
            inputs: "[s2]",
            options: {
                loop: loopMusic ? -1 : 0,
                size: audioFileDetails.format.size, // number of samples to use for the loop
            },
            outputs: "[s2]"
        },
        {
            filter: "apad",
            inputs: "[s1]",
            options: ['pad_dur=5'],
            outputs: "[s1]"
        },
        {
            filter: 'amix',
            inputs: ["[s1]", "[s2]"],
            options: {
                duration: 'first'
            },
            outputs: "[out]"
        },
        {
            filter: 'afade',
            inputs: "[out]",
            options: {
                type: 'out',
                start_time: Number(voiceDelay) + voiceLength,
                duration: 5,
                curve: 'tri'
            }
        }
    ])

    // Set output file path
    const outputPath = path.join(__dirname, outputFile);

    command.output(outputPath)
        .on('end', async () => {
            try {
                // Get a reference to the Firebase Storage bucket
                const storage = getStorage(app);

                // Create a reference to the output file in Firebase Storage
                const storageRef = ref(storage, `${userEmail}/${outputFile}`);

                // Read the output file from the local filesystem
                const fileData = fs.readFileSync(outputPath);

                // Upload the file to Firebase Storage
                await uploadBytes(storageRef, fileData);

                // Get the download URL of the uploaded file
                const downloadURL = await getDownloadURL(storageRef);

                console.log('Merged file uploaded:', uniqueId);

                // Optionally, you can delete the local output file
                fs.unlinkSync(outputPath);
            } catch (error) {
                console.error('Error uploading merged file:', error);
            }
        })
        .run();
}




function getSampleSize(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {

                resolve(metadata);
            }
        });
    });
}
module.exports = { mergeFiles };