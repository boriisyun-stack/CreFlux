import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'node:process';
import translate from 'google-translate-api-x';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const MAX_TEXTS = 50;
const MAX_TEXT_LENGTH = 4000;
const JSON_BODY_LIMIT = '100kb';
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const LANG_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;
const requestBuckets = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

app.use('/api', (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    for (const [key, entry] of requestBuckets) {
        if (now - entry.start >= RATE_WINDOW_MS) requestBuckets.delete(key);
    }

    const bucket = requestBuckets.get(ip);
    if (!bucket) {
        requestBuckets.set(ip, { start: now, count: 1 });
        return next();
    }

    if (now - bucket.start >= RATE_WINDOW_MS) {
        requestBuckets.set(ip, { start: now, count: 1 });
        return next();
    }

    bucket.count += 1;
    if (bucket.count > RATE_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many requests. Please retry later.' });
    }
    return next();
});

// Serve the static files from the React app
app.use(express.static(join(__dirname, 'dist')));

// Translation API Endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { texts, targetLang = 'ko' } = req.body;

        if (!texts || !Array.isArray(texts)) {
            return res.status(400).json({ error: 'texts array is required' });
        }
        if (texts.length === 0) {
            return res.status(400).json({ error: 'texts array must not be empty' });
        }
        if (texts.length > MAX_TEXTS) {
            return res.status(413).json({ error: `texts array can include up to ${MAX_TEXTS} items` });
        }

        const cleanTexts = texts.map((text) => (typeof text === 'string' ? text.trim() : ''));
        if (cleanTexts.some((text) => !text)) {
            return res.status(400).json({ error: 'every text item must be a non-empty string' });
        }
        if (cleanTexts.some((text) => text.length > MAX_TEXT_LENGTH)) {
            return res.status(413).json({ error: `each text must be shorter than ${MAX_TEXT_LENGTH} chars` });
        }

        const safeTargetLang = typeof targetLang === 'string' ? targetLang.trim() : '';
        if (!LANG_CODE_PATTERN.test(safeTargetLang)) {
            return res.status(400).json({ error: 'targetLang must be a valid language code (ex: ko, en, pt-BR)' });
        }

        const settled = await Promise.allSettled(
            cleanTexts.map((text) => translate(text, { to: safeTargetLang }))
        );

        const failedIndexes = [];
        const translations = settled.map((result, index) => {
            if (result.status === 'fulfilled') return result.value.text;
            failedIndexes.push(index);
            return cleanTexts[index];
        });

        if (failedIndexes.length === cleanTexts.length) {
            throw new Error('All translation requests failed.');
        }

        res.json({ translations, failedIndexes });
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
