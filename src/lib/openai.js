import OpenAI from 'openai';

function asString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(' ');
    if (typeof value === 'object') {
        return asString(value.text ?? value.content ?? value.value ?? '');
    }
    return String(value).trim();
}

function clampScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function stripCodeFence(text) {
    return text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .replace(/```/g, '')
        .trim();
}

function normalizeJsonText(text) {
    return text
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function tryParseJsonCandidate(candidate) {
    const normalized = normalizeJsonText(candidate);
    try {
        return JSON.parse(normalized);
    } catch {
        const pythonic = normalized
            .replace(/:\s*'([^']*)'/g, ':"$1"')
            .replace(/'([^']*)'\s*:/g, '"$1":')
            .replace(/\[\s*'([^']*)'\s*\]/g, '["$1"]')
            .replace(/'\s*,\s*'/g, '","');
        try {
            return JSON.parse(pythonic);
        } catch {
            return null;
        }
    }
}

function parseLLMJson(content) {
    if (!content) {
        throw new Error('Model response is empty.');
    }

    const text = stripCodeFence(asString(content));
    const candidates = [text];
    const objectMatch = text.match(/\{[\s\S]*\}/);
    const arrayMatch = text.match(/\[[\s\S]*\]/);

    if (objectMatch) candidates.push(objectMatch[0]);
    if (arrayMatch) {
        candidates.push(`{"ideas":${arrayMatch[0]}}`);
        candidates.push(`{"evaluations":${arrayMatch[0]}}`);
    }

    for (const candidate of [...new Set(candidates)]) {
        const parsed = tryParseJsonCandidate(candidate);
        if (parsed !== null) return parsed;
    }

    throw new Error(`JSON parse error: Invalid model output. Snippet: ${text.substring(0, 160)}`);
}

function normalizeIdeas(ideasLike) {
    const rawIdeas = Array.isArray(ideasLike)
        ? ideasLike
        : Array.isArray(ideasLike?.ideas)
            ? ideasLike.ideas
            : [];

    return rawIdeas
        .map((item, index) => {
            if (typeof item === 'string') {
                const summary = item.trim();
                if (!summary) return null;
                const title = summary.length > 60 ? `${summary.slice(0, 57)}...` : summary;
                return { t: title, s: summary };
            }
            if (!item || typeof item !== 'object') return null;

            const summary = asString(item.s ?? item.summary ?? item.content ?? item.idea ?? item.description);
            let title = asString(item.t ?? item.title ?? item.name ?? item.topic);

            if (!title && summary) {
                title = summary.split(/[.!?]/)[0].slice(0, 60).trim();
            }
            if (!title) title = `Idea ${index + 1}`;

            return { t: title, s: summary || title };
        })
        .filter(Boolean);
}

function fallbackEvaluations(ideasArray) {
    return normalizeIdeas(ideasArray).slice(0, 10).map((idea, index) => ({
        title: idea.t || `Idea ${index + 1}`,
        idea: idea.s || idea.t || '',
        thoughtProcess: '',
        evaluation: {
            syntax: 50,
            feasibility: 50,
            relevance: 50,
            novelty: 50,
            reasoning: 'Structured evaluation was unavailable, so this fallback result is shown.',
        },
    }));
}

// ── Compact generation prompt (title + 1-line summary only) ──
const GEN_SYSTEM = `Rogue creative AI. Generate 100 wild, strange, out-of-the-box ideas from the user's topic. Combine unrelated concepts, break logic. Each idea: short title + 1-sentence summary (max 15 words). English only. JSON: {"ideas":[{"t":"Title","s":"One-line summary"},…]}`;

// ── Compact evaluation prompt (picks top 10, writes full content) ──
const EVAL_SYSTEM = `Evaluator. From 100 idea summaries and the user prompt, pick top 10 most interesting/feasible. For each, WRITE a full expanded paragraph of content (2-4 sentences), a thought-process chain (5-7 words linked by →), and score 0-100 on: syntax, feasibility, relevance, novelty. English only. JSON:
{"evaluations":[{"i":index,"title":"Title","content":"Full expanded idea content…","thoughtProcess":"Word→Word→Word","syn":n,"fea":n,"rel":n,"nov":n,"reason":"1 sentence"}]}`;

async function generateWithGeminiNative(providerConfig, prompt, temperature) {
    const { apiKey, model } = providerConfig;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: GEN_SYSTEM }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, response_mime_type: "application/json" }
        })
    });

    if (!response.ok) {
        let errMsg = `Gemini API Error: ${response.statusText}`;
        try {
            const e = await response.json();
            if (e.error?.message) errMsg += ` - ${e.error.message}`;
        } catch {
            // Keep the generic status text when API body is not JSON.
        }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content. May have been blocked by safety filters.');
    const parsed = parseLLMJson(text);
    return normalizeIdeas(parsed.ideas ?? parsed);
}

function compactIdeasForEval(ideasArray) {
    const normalized = normalizeIdeas(ideasArray);
    // Convert to numbered list string: "0. Title – Summary\n1. ..."
    return normalized.map((idea, i) => {
        const title = idea.t || idea.title || '';
        const summary = idea.s || idea.content || '';
        return `${i}. ${title} – ${summary}`;
    }).join('\n');
}

function mapEvalResults(evaluations, ideasArray) {
    const ideaPool = normalizeIdeas(ideasArray);
    const rows = Array.isArray(evaluations)
        ? evaluations
        : Array.isArray(evaluations?.evaluations)
            ? evaluations.evaluations
            : [];

    return rows
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;

            const idx = Number(item.i ?? item.index ?? item.id);
            const hasIndex = Number.isFinite(idx) && idx >= 0 && idx < ideaPool.length;
            const baseIdea = hasIndex ? ideaPool[Math.trunc(idx)] : ideaPool[index];
            const title = asString(item.title ?? item.t ?? baseIdea?.t ?? `Idea ${index + 1}`);
            const idea = asString(item.content ?? item.idea ?? item.description ?? baseIdea?.s ?? title);
            const thoughtProcess = asString(item.thoughtProcess ?? item.chain ?? item.thought);

            return {
                title,
                idea,
                thoughtProcess,
                evaluation: {
                    syntax: clampScore(item.syn ?? item.syntax),
                    feasibility: clampScore(item.fea ?? item.feasibility),
                    relevance: clampScore(item.rel ?? item.relevance),
                    novelty: clampScore(item.nov ?? item.novelty),
                    reasoning: asString(item.reason ?? item.reasoning ?? item.rationale),
                },
            };
        })
        .filter((row) => row && (row.title || row.idea))
        .slice(0, 10);
}

async function evaluateIdeasBatchWithGeminiNative(providerConfig, prompt, ideasArray) {
    const { apiKey, model } = providerConfig;
    const compactList = compactIdeasForEval(ideasArray);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: EVAL_SYSTEM }] },
            contents: [{ parts: [{ text: `Prompt: ${prompt}\n\nIdeas:\n${compactList}` }] }],
            generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
        })
    });

    if (!response.ok) {
        let errMsg = `Gemini API Error: ${response.statusText}`;
        try {
            const e = await response.json();
            if (e.error?.message) errMsg += ` - ${e.error.message}`;
        } catch {
            // Keep the generic status text when API body is not JSON.
        }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content during evaluation.');
    const result = parseLLMJson(text);
    const mapped = mapEvalResults(result.evaluations ?? result, ideasArray);
    return mapped.length > 0 ? mapped : fallbackEvaluations(ideasArray);
}

/**
 * Generates 100 wild ideas (title + 1-line summary) using the configured AI provider.
 */
export async function generateIdeas(providerConfig, prompt, temperature = 2.0) {
    const { apiKey, baseURL, model, provider } = providerConfig;
    if (!apiKey) throw new Error("API Key is required.");

    if (provider === 'gemini') {
        return await generateWithGeminiNative(providerConfig, prompt, temperature);
    }

    const clientConfig = { dangerouslyAllowBrowser: true, apiKey };
    if (baseURL) clientConfig.baseURL = baseURL;
    const openai = new OpenAI(clientConfig);

    try {
        const payload = {
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: GEN_SYSTEM },
                { role: 'user', content: prompt }
            ],
            temperature,
            presence_penalty: 2.0,
            frequency_penalty: 2.0,
        };
        if (provider !== 'ollama' && provider !== 'gemma2') {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);
        const parsed = parseLLMJson(response.choices[0].message.content);
        return normalizeIdeas(parsed.ideas ?? parsed);
    } catch (error) {
        throw new Error(error?.error?.message || error?.message || "Failed to generate ideas.");
    }
}

/**
 * Evaluates a batch of ideas against the original prompt and returns the top 10.
 */
export async function evaluateIdeasBatch(providerConfig, prompt, ideasArray) {
    const { apiKey, baseURL, model, provider } = providerConfig;

    if (provider === 'gemini') {
        try {
            return await evaluateIdeasBatchWithGeminiNative(providerConfig, prompt, ideasArray);
        } catch (e) {
            console.error("Evaluation Error:", e);
            throw new Error(`Evaluation failed: ${e.message}`);
        }
    }

    const clientConfig = { dangerouslyAllowBrowser: true, apiKey };
    if (baseURL) clientConfig.baseURL = baseURL;
    const openai = new OpenAI(clientConfig);

    const compactList = compactIdeasForEval(ideasArray);

    try {
        const payload = {
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: EVAL_SYSTEM },
                { role: 'user', content: `Prompt: ${prompt}\n\nIdeas:\n${compactList}` }
            ],
            temperature: 0.1,
        };
        if (provider !== 'ollama' && provider !== 'gemma2') {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);
        const result = parseLLMJson(response.choices[0].message.content);
        const mapped = mapEvalResults(result.evaluations ?? result, ideasArray);
        return mapped.length > 0 ? mapped : fallbackEvaluations(ideasArray);
    } catch (error) {
        console.error("Evaluation Error:", error);
        const fallback = fallbackEvaluations(ideasArray);
        if (fallback.length > 0) return fallback;
        throw new Error(error.message || "Evaluation API Error");
    }
}

/**
 * Enhances a short user prompt into a structured command.
 * Now done client-side to save an API call.
 */
export async function enhancePrompt(_providerConfig, prompt) {
    // No API call — just wrap the prompt locally
    return `Find me 100 creative, wild, unconventional ideas for: ${prompt}`;
}
