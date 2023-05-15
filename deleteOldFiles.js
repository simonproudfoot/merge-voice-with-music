const fs = require('fs');
const path = require('path');
function deleteOldFiles(directory) {
    // Get the current time
    const currentTime = new Date();

    // Read the files in the directory
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.log('An error occurred while reading the directory: ' + err.message);
            return;
        }

        // Iterate through the files
        files.forEach((file) => {
            const filePath = path.join(directory, file);

            // Get the file's stats
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.log('An error occurred while getting file stats: ' + err.message);
                    return;
                }

                // Calculate the file's age in minutes
                const fileAgeMinutes = (currentTime - stats.mtime) / (1000 * 60);
                

                // Delete files older than 10 minutes
                if (fileAgeMinutes > 5) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.log('An error occurred while deleting the file: ' + err.message);
                        } else {
                            console.log('Deleted file: ' + filePath);
                        }
                    });
                }
            });
        });
    });
}

module.exports = deleteOldFiles;