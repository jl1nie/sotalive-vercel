const express = require('express');
const path = require('path');
const app = express();

// プロジェクトルートからの絶対パスを基準にしたマッピング
const staticDirs = {
    'myact.vercel.app': '/public/myact',
    'myqth.vercel.app': '/public/myqth',
    'logconv.vercel.app': '/public/logconv',
    'logconv.sotalive.net': '/public/logconv',
    'myqth.sotalive.net': '/public/myqth',
    'localhost': '/public/logconv',
};

// Preview環境用のフォールバック
const isVercelPreview = () => process.env.VERCEL_ENV === 'preview';
const defaultStaticPath = '/public/logconv'; // ルート配下のデフォルトパス

// 静的ファイルのミドルウェア
app.use((req, res, next) => {
    let staticPath = staticDirs[req.hostname];

    if (isVercelPreview() && !staticPath) {
        staticPath = defaultStaticPath;
        console.log(`Preview detected: Using default path ${staticPath}`);
    }

    let fullpath = path.join(process.cwd(), staticPath);
    console.log(`Hostname: ${req.hostname}, Static Path: ${fullpath}`);

    if (staticPath) {
        // プロジェクトルートからの絶対パスを使用
        express.static(fullpath)(req, res, next);
    } else {
        next();
    }
});

// ルートエンドポイント
app.get('/', (req, res) => {
    let staticPath = staticDirs[req.hostname];

    if (!staticPath && isVercelPreview(req.hostname)) {
        staticPath = defaultStaticPath;
    }

    if (staticPath) {
        const filePath = path.join(process.cwd(), staticPath, 'index.html');
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(`Error sending file: ${filePath}`, err);
                res.status(500).send('Internal Server Error');
            }
        });
    } else {
        res.status(404).send('Not Found');
    }
});

// 未処理の例外をログ
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

module.exports = app;