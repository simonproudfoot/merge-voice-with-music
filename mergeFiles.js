const ffmpeg = require('fluent-ffmpeg');
function mergeFiles(res, voicePath, musicPath, voiceDelay, musicVolume) {

    console.log('Voice received!')
    console.log('voicePath', voicePath)
    console.log('musicPath', musicPath)
    console.log('musicVolume', musicVolume)
    console.log('voiceDelay', voiceDelay)

    const outputFile = 'output.mp3'; // name of file (rename to oroginal file name)

    // Create a new ffmpeg command
    const command = ffmpeg();

    // Add the voice file
    command.input(voicePath);

    // Add the music fole
    command.input(musicPath)

    // Use the concat filter to merge the two input files
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
            filter: "apad",
            inputs: "[s1]",
            options: ['pad_dur=5'],
            outputs: "[s1]"
        },

        {
            filter: 'amix',
            inputs: ["[s1]", "[s2]"],
            options: ['duration=first', 'dropout_transition=5']
        }])

    //Set the output format and file path
    command.outputFormat('mp3').save(outputFile);

    // Run the command and send the output file as a response
    command.on('error', function (err) {
        console.log('An error occurred: ' + err.message);
        res.status(500).send('An error occurred while processing the voice file');
    })
        .on('end', function () {
            console.log('Finished processing');
            res.sendFile(outputFile, { root: __dirname }, (err) => {
                if (err) {
                    console.log('An error occurred while sending the file: ' + err.message);
                    res.status(500).send('An error occurred while sending the file');
                } else {
                    console.log('File sent successfully');
                    return
                }
            });
        });
}


module.exports = { mergeFiles };