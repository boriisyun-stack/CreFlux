import OpenAI from 'openai';

function parseLLMJson(content) {
    const match = content.match(/\{[\s\S]*\}/);
    let jsonStr = match ? match[0] : content;

    jsonStr = jsonStr.replace(/[\n\r\t]/g, ' ');
    jsonStr = jsonStr.replace(/"(\w+)\s+(\w+)"\s*:/g, '"$1$2":');
    jsonStr = jsonStr.replace(/,\s*,+/g, ',');
    jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');

    try {
        return JSON.parse(jsonStr);
    } catch (e1) {
        let repaired = jsonStr
            .replace(/\[\s*\\"/g, '["')
            .replace(/\\"\s*\]/g, '"]')
            .replace(/\\"\s*,\s*\\"/g, '","')
            .replace(/:\s*\\"/g, ':"')
            .replace(/\\"\s*,/g, '",');

        try {
            return JSON.parse(repaired);
        } catch (e2) {
            let pythonic = repaired
                .replace(/[""]/g, '"')
                .replace(/:\s*'([^']*)'/g, ':"$1"')
                .replace(/'([^']*)'\s*:/g, '"$1":')
                .replace(/\[\s*'/g, '["')
                .replace(/'\s*\]/g, '"]')
                .replace(/'\s*,\s*'/g, '","')
                .replace(/,\s*,+/g, ',')
                .replace(/,\s*([\}\]])/g, '$1');

            try {
                return JSON.parse(pythonic);
            } catch (e3) {
                const ideasMatch = pythonic.match(/"idea\w*"\s*:\s*\[([\s\S]*?)\]/);
                if (ideasMatch && ideasMatch[1]) {
                    const items = ideasMatch[1].match(/"([^"]+)"/g) || [];
                    if (items.length > 0) {
                        return { ideas: items.map(s => s.replace(/^"|"$/g, '').trim()).filter(s => s.length > 2) };
                    }
                }
                throw new Error("JSON parse error: " + e1.message + " — Output snippet: " + jsonStr.substring(0, 120));
            }
        }
    }
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
        try { const e = await response.json(); if (e.error?.message) errMsg += ` - ${e.error.message}`; } catch { }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content. May have been blocked by safety filters.');
    const parsed = JSON.parse(text);
    return parsed.ideas || [];
}

function compactIdeasForEval(ideasArray) {
    // Convert to numbered list string: "0. Title – Summary\n1. ..."
    return ideasArray.map((idea, i) => {
        const title = idea.t || idea.title || '';
        const summary = idea.s || idea.content || '';
        return `${i}. ${title} – ${summary}`;
    }).join('\n');
}

function mapEvalResults(evaluations, ideasArray) {
    return (evaluations || []).map(item => ({
        title: item.title || ideasArray[item.i]?.t || ideasArray[item.i]?.title || "Untitled Idea",
        idea: item.content || "",
        thoughtProcess: item.thoughtProcess || "",
        evaluation: {
            syntax: item.syn ?? item.syntax ?? 0,
            feasibility: item.fea ?? item.feasibility ?? 0,
            relevance: item.rel ?? item.relevance ?? 0,
            novelty: item.nov ?? item.novelty ?? 0,
            reasoning: item.reason ?? item.reasoning ?? ""
        }
    }));
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
        try { const e = await response.json(); if (e.error?.message) errMsg += ` - ${e.error.message}`; } catch { }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content during evaluation.');
    const result = JSON.parse(text);
    return mapEvalResults(result.evaluations, ideasArray);
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
        return parsed.ideas || [];
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
        return mapEvalResults(result.evaluations, ideasArray);
    } catch (error) {
        console.error("Evaluation Error:", error);
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
