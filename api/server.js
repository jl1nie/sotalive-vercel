const express = require('express');
const path = require('path');
const app = express();
module.exports = app;

const staticDirs = {
    'myact.vercel.app': '../public/myact',
    'myqth.vercel.app': '../public/myqth',
    'logconv.sotalive.net': '../public/logconv',
    'myqth.sotalive.net': '../public/myqth',
    'localhost': '../public/logconv',
};

app.use((req, res, next) => {
    const staticPath = staticDirs[req.hostname];
    console.log(staticPath)
    console.log(req.hostname)
    if (staticPath) {
        express.static(staticPath)(req, res, next);
    } else {
        res.status(404).send('Not Found');
    }
});

app.get('/', (req, res) => {
    const staticPath = staticDirs[req.hostname];
    if (staticPath) {
        res.sendFile(path.join(__dirname, staticPath, 'index.html'));
    } else {
        res.status(404).send('Not Found');
    }
});

process.on("uncaughtException", (error) => { console.error("Uncaught Exception:", error); });

module.exports = app