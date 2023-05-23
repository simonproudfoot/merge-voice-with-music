const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

async function mergeFiles(voicePath, musicPath, voiceDelay, musicVolume, loopMusic) {
    console.log('Merging files: ', musicPath)
    const uniqueId = Math.floor(Math.random() * 1000000);
    const outputFile = `output_${uniqueId}.mp3`;
    let audioFileDetails = await getSampleSize(musicPath)
    let voiceFileDetails = await getSampleSize(voicePath)
    let voiceLength = voiceFileDetails.streams[0].duration

    const command = ffmpeg();
    // Add the voice file
    command.input(voicePath);
    // Add the music file
    command.input(musicPath)

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
    const outputFilePath = path.join(__dirname, 'storage', outputFile);
    // Set the output format and file path
    console.log('Saving final...: ', voicePath);
    command.outputFormat('mp3').save(outputFilePath);
    // Run the command and send the output file as a response
    command.on('error', function (err) {
        console.log('An error occurred: ' + err.message);
        res.status(500).send('An error occurred while processing the voice file');
    })
        .on('end', function () {
            // File saved, do something with it
            console.log('File saved: ', outputFilePath);
            // You can perform any additional operations on the saved file here
        });
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