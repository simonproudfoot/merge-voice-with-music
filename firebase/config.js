const { initializeApp } = require("firebase/app");


const firebaseConfig = {
  apiKey: process.env['FIREBASE_APIKEY'],
  authDomain: process.env['FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['FIREBASE_PROJECTID'],
  storageBucket: process.env['FIREBASE_STOTAGE_BUCKET'],
  appId: process.env['FIREBASE_APPID'],
  measurementId: process.env['FIREBASE_MEASURMENTID']
};

const app = initializeApp(firebaseConfig);


module.exports = { app };
