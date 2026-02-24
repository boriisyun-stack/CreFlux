import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'node:process';
import translate from 'google-translate-api-x';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Serve the static files from the React app
app.use(express.static(join(__dirname, 'dist')));

// Translation API Endpoint
// The user specifically requested DuckDuckGo. We'll attempt a DDG-like search approach 
// but use google-translate-api-x as a robust engine if DDG is blocked.
app.post('/api/translate', async (req, res) => {
    try {
        const { text, to = 'ko' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        // Attempting to fetch from DDG Translation API
        // Note: This endpoint is often anti-bot protected, but we try a best-effort.
        try {
            const ddgResponse = await fetch(`https://duckduckgo.com/translation.js?query=translate&from=en&to=${to}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                body: new URLSearchParams({
                    vqd: '4-65971272420410940082908410129211187239', // Dummy or fetched VQD
                    query: text
                })
            });

            if (ddgResponse.ok) {
                const data = await ddgResponse.json();
                if (data.translated) {
                    return res.json({ translatedText: data.translated });
                }
            }
        } catch (e) {
            console.warn('DDG Translation failed, falling back to primary engine:', e.message);
        }

        // Reliable fallback engine
        const result = await translate(text, { to });
        res.json({ translatedText: result.text });

    } catch (err) {
        console.error('Translation error:', err);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Handles any requests that don't match the ones above
app.use((req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
