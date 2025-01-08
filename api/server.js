const express = require('express');
const path = require('path');
const app = express();

const staticDirs = {
    'myqth.vercel.app': 'public/myqth',
    'myact.vercel.app': 'public/myact',
    'logconv.vercel.app': 'public/logconv',
};

app.use((req, res, next) => {
    const staticPath = staticDirs[req.hostname];
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
