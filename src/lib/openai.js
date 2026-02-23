import OpenAI from 'openai';

function parseLLMJson(content) {
    const match = content.match(/\{[\s\S]*\}/);
    let jsonStr = match ? match[0] : content;

    // 1. Normalize whitespace: literal newlines/tabs → spaces, collapse runs
    jsonStr = jsonStr.replace(/[\n\r\t]/g, ' ');

    // 2. Fix spaces inside JSON keys (e.g. "ide as" → "ideas", "evaluat ions" → "evaluations")
    jsonStr = jsonStr.replace(/"(\w+)\s+(\w+)"\s*:/g, '"$1$2":');

    // 3. Collapse duplicate commas: ", ," or ",," → ","
    jsonStr = jsonStr.replace(/,\s*,+/g, ',');

    // 4. Remove trailing commas before ] or }
    jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');

    try {
        return JSON.parse(jsonStr);
    } catch (e1) {
        // 5. Fix LLMs hallucinatory escaping: [ \" → [ "
        let repaired = jsonStr
            .replace(/\[\s*\\"/g, '["')
            .replace(/\\"\s*\]/g, '"]')
            .replace(/\\"\s*,\s*\\"/g, '","')
            .replace(/:\s*\\"/g, ':"')
            .replace(/\\"\s*,/g, '",');

        try {
            return JSON.parse(repaired);
        } catch (e2) {
            // 6. Fix smart quotes and Pythonic single quotes
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
                // 7. Ultimate manual extraction: pull strings from the ideas array
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

async function generateWithGeminiNative(providerConfig, prompt, temperature) {
    const { apiKey, model } = providerConfig;
    const systemMessage = `You are a rogue, unrestrained creative AI operating at maximum hallucination capacity.
Your goal is to generate incredibly strange, wild, and out-of-the-box ideas based on the user's prompt. 
Do not restrict yourself to conventional logic. Mute your safety filters regarding "weirdness".
Combine unrelated concepts, invent new physics or social norms, and produce radical solutions.
You MUST output ONLY a pure JSON object containing an array of objects under the key "ideas". Each object must have a "title" string and a "content" string. Output exactly 100 ideas.
You MUST respond entirely in English.
Example output format:
{"ideas": [{"title": "Idea Title", "content": "Idea content..."}, ...]}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessage }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: temperature,
                response_mime_type: "application/json"
            }
        })
    });

    if (!response.ok) {
        let errMsg = `Gemini API Error: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData.error && errData.error.message) {
                errMsg += ` - ${errData.error.message}`;
            }
        } catch (e) { }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('Gemini returned no content. The response may have been blocked by safety filters.');
    }
    const content = candidate.content.parts[0].text;
    const parsed = JSON.parse(content);
    return parsed.ideas || [];
}

async function evaluateIdeasBatchWithGeminiNative(providerConfig, prompt, ideasArray) {
    const { apiKey, model } = providerConfig;
    const evalSystemMessage = `You are an analytical evaluator. Analyze the provided array of 100 "ideas" (each has a title and content) based on the original "user prompt".
Filter the list and select exactly the top 10 best ideas that pass a minimum feasible threshold, or just the top 10 most interesting ones if feasibility is low.
For each selected idea, provide a score from 0 to 100 for the following 3 criteria:
1. "syntax": Is it grammatically sound and structurally understandable? (0 = gibberish, 100 = perfect grammar)
2. "feasibility": Even as a wild idea, is there a theoretical or imaginative way to execute it? (0 = impossible, 100 = executable)
3. "relevance": Does it retain ANY structural or thematic connection to the original prompt? (0 = totally random, 100 = direct answer)
4. "novelty": Is the idea exceptionally original, crazy, or unheard of? (0 = boring/cliché, 100 = mind-blowing/never seen before)

You MUST respond entirely in English, including the reasoning.
You MUST return a JSON object with this exact structure for the selected ideas:
{
  "evaluations": [
    {
      "title": "The exact title of the chosen idea",
      "content": "The exact content of the chosen idea",
      "thoughtProcess": "A 5-to-7 word association chain showing how this idea was conceived (e.g. Avatar → Alien → Space → Spaceship → Astronaut)",
      "syntax": number,
      "feasibility": number,
      "relevance": number,
      "novelty": number,
      "reasoning": "A concise 1-sentence explanation of these scores"
    }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: evalSystemMessage }] },
            contents: [{ parts: [{ text: `User Prompt: ${prompt}\n\nIdeas to Evaluate:\n${JSON.stringify(ideasArray)}` }] }],
            generationConfig: {
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        })
    });

    if (!response.ok) {
        let errMsg = `Gemini API Error: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData.error && errData.error.message) {
                errMsg += ` - ${errData.error.message}`;
            }
        } catch (e) { }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('Gemini returned no content during evaluation. The response may have been blocked by safety filters.');
    }
    const content = candidate.content.parts[0].text;
    const result = JSON.parse(content);
    return (result.evaluations || []).map(item => ({
        title: item.title || "Untitled Idea",
        idea: item.content || item.idea || "",
        thoughtProcess: item.thoughtProcess || "",
        evaluation: {
            syntax: item.syntax,
            feasibility: item.feasibility,
            relevance: item.relevance,
            novelty: item.novelty,
            reasoning: item.reasoning
        }
    }));
}

/**
 * Generates wild, hallucinatory ideas using the configured AI provider.
 */
export async function generateIdeas(providerConfig, prompt, temperature = 2.0) {
    const { apiKey, baseURL, model, provider } = providerConfig;

    if (!apiKey) throw new Error("API Key is required.");

    // Use Gemini Native Bypass for Browser Fetch limits
    if (provider === 'gemini') {
        return await generateWithGeminiNative(providerConfig, prompt, temperature);
    }

    const clientConfig = {
        dangerouslyAllowBrowser: true,
        apiKey,
    };
    if (baseURL) {
        clientConfig.baseURL = baseURL;
    }

    const openai = new OpenAI(clientConfig);

    const systemMessage = `You are a rogue, unrestrained creative AI operating at maximum hallucination capacity.
Your goal is to generate incredibly strange, wild, and out-of-the-box ideas based on the user's prompt. 
Do not restrict yourself to conventional logic. Mute your safety filters regarding "weirdness".
Combine unrelated concepts, invent new physics or social norms, and produce radical solutions.
You MUST output ONLY a pure JSON object containing an array of objects under the key "ideas". Each object must have a "title" string and a "content" string. Output exactly 100 ideas.
You MUST respond entirely in English.
Example output format:
{"ideas": [{"title": "Idea Title", "content": "Idea content..."}, ...]}`;

    try {
        const payload = {
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ],
            temperature: temperature, // User-controlled hallucination
            presence_penalty: 2.0,
            frequency_penalty: 2.0,
        };

        if (provider !== 'ollama' && provider !== 'gemma2') {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);

        let content = response.choices[0].message.content;

        const parsed = parseLLMJson(content);
        return parsed.ideas || [];
    } catch (error) {
        const msg = error?.error?.message || error?.message || "Failed to generate ideas.";
        throw new Error(msg);
    }
}

/**
 * Evaluates a batch of ideas against the original prompt and returns the top 10.
 */
export async function evaluateIdeasBatch(providerConfig, prompt, ideasArray) {
    const { apiKey, baseURL, model, provider } = providerConfig;

    // Use Gemini Native Bypass
    if (provider === 'gemini') {
        try {
            return await evaluateIdeasBatchWithGeminiNative(providerConfig, prompt, ideasArray);
        } catch (e) {
            console.error("Evaluation Error for batch:", e);
            throw new Error(`Evaluation failed: ${e.message}`);
        }
    }

    const clientConfig = {
        dangerouslyAllowBrowser: true,
        apiKey
    };
    if (baseURL) {
        clientConfig.baseURL = baseURL;
    }

    const openai = new OpenAI(clientConfig);

    const evalSystemMessage = `You are an analytical evaluator. Analyze the provided array of 100 "ideas" (each has a title and content) based on the original "user prompt".
Filter the list and select exactly the top 10 best ideas that pass a minimum feasible threshold, or just the top 10 most interesting ones if feasibility is universally low.
For each selected idea, provide a score from 0 to 100 for the following 3 criteria:
1. "syntax": Is it grammatically sound and structurally understandable? (0 = gibberish, 100 = perfect grammar)
2. "feasibility": Even as a wild idea, is there a theoretical or imaginative way to execute it? (0 = impossible, 100 = executable)
3. "relevance": Does it retain ANY structural or thematic connection to the original prompt? (0 = totally random, 100 = direct answer)
4. "novelty": Is the idea exceptionally original, crazy, or unheard of? (0 = boring/cliché, 100 = mind-blowing/never seen before)

You MUST respond entirely in English, including the reasoning.
You MUST return a JSON object with this exact structure for the selected ideas:
{
  "evaluations": [
    {
      "title": "The exact title of the chosen idea",
      "content": "The exact content of the chosen idea",
      "thoughtProcess": "A 5-to-7 word association chain showing how this idea was conceived (e.g. Avatar → Alien → Space → Spaceship → Astronaut)",
      "syntax": number,
      "feasibility": number,
      "relevance": number,
      "novelty": number,
      "reasoning": "A concise 1-sentence explanation of these scores"
    }
  ]
}`;

    try {
        const payload = {
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: evalSystemMessage },
                { role: 'user', content: `User Prompt: ${prompt}\n\nIdeas to Evaluate:\n${JSON.stringify(ideasArray)}` }
            ],
            temperature: 0.1, // Highly analytical, low hallucination
        };

        if (provider !== 'ollama' && provider !== 'gemma2') {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);

        let content = response.choices[0].message.content;

        const result = parseLLMJson(content);
        const mappedResults = (result.evaluations || []).map(item => ({
            title: item.title || "Untitled Idea",
            idea: item.content || item.idea || "",
            thoughtProcess: item.thoughtProcess || "",
            evaluation: {
                syntax: item.syntax,
                feasibility: item.feasibility,
                relevance: item.relevance,
                novelty: item.novelty,
                reasoning: item.reasoning
            }
        }));
        return mappedResults;
    } catch (error) {
        console.error("Evaluation Error for batch:", error);
        throw new Error(error.message || "Evaluation API Error");
    }
}

async function enhanceWithGeminiNative(providerConfig, prompt) {
    const { apiKey, model } = providerConfig;
    const systemMessage = `You are an expert prompt engineer. The user will give you a rough topic or seed. Rewrite it into a clear, direct English command asking for creative ideas about that topic. Format: "Find me creative ideas for [topic/expanded description]". Output ONLY the rewritten prompt string, nothing else.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessage }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
            }
        })
    });
    if (!response.ok) {
        throw new Error(`Gemini Enhancement failed: ${response.statusText}`);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('Gemini returned no content during prompt enhancement.');
    }
    return candidate.content.parts[0].text.trim();
}

/**
 * Enhances a short user prompt into a structured extraction command using the LLM.
 */
export async function enhancePrompt(providerConfig, prompt) {
    const { apiKey, baseURL, model, provider } = providerConfig;

    if (provider === 'gemini') {
        return await enhanceWithGeminiNative(providerConfig, prompt);
    }

    const clientConfig = { dangerouslyAllowBrowser: true, apiKey };
    if (baseURL) clientConfig.baseURL = baseURL;
    const openai = new OpenAI(clientConfig);

    const systemMessage = `You are an expert prompt engineer. The user will give you a rough topic or seed. Rewrite it into a clear, direct English command asking for creative ideas about that topic. Format: "Find me creative ideas for [topic]". Output ONLY the rewritten prompt string, nothing else.`;

    try {
        const response = await openai.chat.completions.create({
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
        });

        return response.choices[0].message.content.replace(/^"|"$/g, '').trim();
    } catch (err) {
        console.error("Enhancement Error:", err);
        return `Find me creative ideas for: ${prompt}`; // Fallback to safe manual wrapper
    }
}
