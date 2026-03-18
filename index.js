const http = require('http');
const https = require('https');

const CLIENT_ID     = 'dd491a8a3e9f496f98a4cccbbda50328';
const CLIENT_SECRET = '0f6949c07a844268adbfdd3e0980e046';
const REDIRECT_URI  = 'https://YOUR_RAILWAY_URL/callback';

// Хранилище токенов (ключ = state)
const tokens = {};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Spotify делает redirect сюда
    if (url.pathname === '/callback') {
        const code  = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code) {
            res.writeHead(400);
            res.end('No code');
            return;
        }

        // Обмениваем code на токены
        const body = new URLSearchParams({
            grant_type:    'authorization_code',
            code:          code,
            redirect_uri:  REDIRECT_URI,
            client_id:     CLIENT_ID,
            client_secret: CLIENT_SECRET
        }).toString();

        const options = {
            hostname: 'accounts.spotify.com',
            path:     '/api/token',
            method:   'POST',
            headers:  { 'Content-Type': 'application/x-www-form-urlencoded' }
        };

        const reqSpotify = https.request(options, (respSpotify) => {
            let data = '';
            respSpotify.on('data', chunk => data += chunk);
            respSpotify.on('end', () => {
                const json = JSON.parse(data);
                if (json.refresh_token && state) {
                    tokens[state] = json.refresh_token;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body style="background:#0a0a14;color:#aaffaa;font-family:monospace;text-align:center;padding:50px"><h2>✅ Spotify подключён!</h2><p>Закройте эту вкладку и вернитесь в Minecraft</p></body></html>');
            });
        });

        reqSpotify.write(body);
        reqSpotify.end();
        return;
    }

    // Minecraft опрашивает этот endpoint
    if (url.pathname === '/token') {
        const state = url.searchParams.get('state');
        if (state && tokens[state]) {
            const token = tokens[state];
            delete tokens[state]; // удаляем после получения
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(token);
        } else {
            res.writeHead(204);
            res.end();
        }
        return;
    }

    res.writeHead(404);
    res.end();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
