const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// プロジェクトルートからの絶対パスを基準にしたマッピング
const staticDirs = {
    'myact.vercel.app': '/public/myact',
    'myqth.vercel.app': '/public/myqth',
    'logconv.vercel.app': '/public/logconv',
    'myact.sotalive.net': '/public/myact',
    'myqth.sotalive.net': '/public/myqth',
    'logconv.sotalive.net': '/public/logconv',
    'localhost': '/public/logconv',
};

// Preview環境用のフォールバック
const isVercelPreview = () => process.env.VERCEL_ENV === 'preview';
const defaultStaticPath = '/public/logconv'; // ルート配下のデフォルトパス

app.use((req, res, next) => {
    let staticPath = staticDirs[req.hostname];

    if (isVercelPreview() && !staticPath) {
        staticPath = defaultStaticPath;
        console.log(`Preview environment detected: Using default path ${staticPath}`);
    }

    if (staticPath) {
        const fullPath = path.join(process.cwd(), staticPath);

        if (fs.existsSync(fullPath)) {
            return express.static(fullPath)(req, res, next);
        } else {
            console.error(`Directory not found: ${fullPath}`);
            return res.status(500).send('Static directory not found');
        }

    } else {
        console.log(`No static path for hostname: ${req.hostname}`);
        return res.status(404).send('Not Found');
    }
});


module.exports = app;