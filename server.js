import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import translate from 'google-translate-api-x';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve the static files from the React app
app.use(express.static(join(__dirname, 'dist')));

// Translation API Endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { texts, targetLang = 'ko' } = req.body;

        if (!texts || !Array.isArray(texts)) {
            return res.status(400).json({ error: 'texts array is required' });
        }

        const promises = texts.map(text => translate(text, { to: targetLang }));
        const results = await Promise.all(promises);

        res.json({ translations: results.map(r => r.text) });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Failed to translate blocks' });
    }
});

// Handles any requests that don't match the ones above
app.use((req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
