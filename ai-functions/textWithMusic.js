const axios = require('axios');
const fs = require('fs');
const { pipeline } = require('node:stream/promises');
const uuid = require('uuid');
const deleteOldFiles = require('../deleteOldFiles');
const path = require('path');
const mergeFiles = require('../mergeFiles.js');
const { Worker } = require('worker_threads');
const processVoice = require('../processVoice.js');


exports.textWithMusic = async (req, res) => {
    processVoice(req, res);

    res.send('done')



    console.log('Request received');

  
};



