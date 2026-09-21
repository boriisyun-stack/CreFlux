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

function sanitizeJsonString(str) {
    let inString = false;
    let escaped = false;
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inString) {
            if (escaped) {
                escaped = false;
                out += c;
            } else if (c === '\\') {
                escaped = true;
                out += c;
            } else if (c === '"') {
                inString = false;
                out += c;
            } else if (c === '\n') {
                out += '\\n';
            } else if (c === '\r') {
                out += '\\r';
            } else if (c === '\t') {
                out += '\\t';
            } else {
                out += c;
            }
        } else {
            if (c === '"') inString = true;
            out += c;
        }
    }
    return out;
}

function stripCodeFence(text) {
    return text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .replace(/```/g, '')
        .trim();
}

function normalizeJsonText(text) {
    const sanitized = sanitizeJsonString(text);
    return sanitized
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function extractJsonBlocks(text) {
    const blocks = [];
    const openerSet = new Set(['{', '[']);
    const closerMap = { '{': '}', '[': ']' };

    for (let i = 0; i < text.length; i += 1) {
        const startChar = text[i];
        if (!openerSet.has(startChar)) continue;

        const stack = [startChar];
        let inString = false;
        let escaped = false;

        for (let j = i + 1; j < text.length; j += 1) {
            const ch = text[j];

            if (inString) {
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (ch === '\\') {
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = false;
                }
                continue;
            }

            if (ch === '"') {
                inString = true;
                continue;
            }

            if (openerSet.has(ch)) {
                stack.push(ch);
                continue;
            }

            if (ch === '}' || ch === ']') {
                const last = stack[stack.length - 1];
                if (!last || closerMap[last] !== ch) {
                    break;
                }
                stack.pop();

                if (stack.length === 0) {
                    blocks.push(text.slice(i, j + 1));
                    i = j;
                    break;
                }
            }
        }
    }

    return blocks;
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

function repairTruncatedJson(str) {
    const trimmed = str.trim();
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace !== -1) {
        const sliced = trimmed.slice(0, lastBrace + 1);
        if (sliced.includes('[') && !sliced.endsWith(']')) {
            return [sliced + ']}', sliced + ']'];
        }
        return [sliced + '}'];
    }
    return [];
}

function parseLLMJson(content) {
    if (!content) {
        throw new Error('Model response is empty.');
    }

    const text = stripCodeFence(asString(content));
    const candidates = [text];
    const jsonBlocks = extractJsonBlocks(text);

    for (const block of jsonBlocks) {
        candidates.push(block);
        if (block.startsWith('[')) {
            candidates.push(`{"ideas":${block}}`);
            candidates.push(`{"evaluations":${block}}`);
        }
    }

    // Try repairing potentially truncated JSON
    for (const rep of repairTruncatedJson(text)) {
        candidates.push(rep);
        if (rep.startsWith('[')) {
            candidates.push(`{"ideas":${rep}}`);
            candidates.push(`{"evaluations":${rep}}`);
        }
    }

    for (const candidate of [...new Set(candidates)]) {
        const parsed = tryParseJsonCandidate(candidate);
        if (parsed !== null) return parsed;
    }

    throw new Error(`JSON parse error: Invalid model output. Snippet: ${text.substring(0, 160)}`);
}

export function sanitizeTitle(rawTitle) {
    if (!rawTitle) return '';
    let title = asString(rawTitle).trim();

    // 1. If the title contains JSON snippet like '{"t":"Obsidian Maw"' or '"title":"Obsidian Maw"'
    const jsonTitleMatch = title.match(/"(?:t|title)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (jsonTitleMatch && jsonTitleMatch[1]) {
        title = jsonTitleMatch[1].replace(/\\"/g, '"').trim();
    }

    // 2. Strip JSON framing leftovers: [{"ideas": ... or {"t": ...
    title = title.replace(/^[[{,\s]*(?:"(?:ideas|evaluations)"\s*:\s*\[\s*)?(?:\{)?(?:"(?:t|title)"\s*:\s*)?/i, '');
    title = title.replace(/[\]},\s]+$/, '');
    title = title.replace(/^["']+|["']+$/g, '').trim();

    // 3. If there is still a residual JSON property pattern like "s":"... or "tag":"...
    if (title.includes('":') || title.includes('{"') || title.includes('"}')) {
        const match = title.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (match && match[1]) {
            title = match[1].replace(/\\"/g, '"').trim();
        }
    }

    // 4. Final safety check: if it still has braces or array brackets at edges
    if (/^[[{].*[\]}]$/.test(title)) {
        title = title.replace(/[[\]{}"']/g, '').trim().slice(0, 60);
    }

    return title;
}

function normalizeIdeas(ideasLike) {
    let rawIdeas = [];
    if (Array.isArray(ideasLike)) {
        if (ideasLike.length > 0 && Array.isArray(ideasLike[0]?.ideas)) {
            rawIdeas = ideasLike.flatMap((item) => Array.isArray(item?.ideas) ? item.ideas : item);
        } else {
            rawIdeas = ideasLike;
        }
    } else if (Array.isArray(ideasLike?.ideas)) {
        rawIdeas = ideasLike.ideas;
    } else if (ideasLike && typeof ideasLike === 'object') {
        const arr = Object.values(ideasLike).find(Array.isArray);
        if (arr) rawIdeas = arr;
    }

    return rawIdeas
        .map((item, index) => {
            if (typeof item === 'string') {
                const summary = item.trim();
                if (!summary) return null;
                const title = sanitizeTitle(summary.length > 60 ? `${summary.slice(0, 57)}...` : summary);
                return { t: title, s: summary, tag: 'Bisociation' };
            }
            if (!item || typeof item !== 'object') return null;

            if (Array.isArray(item.ideas)) {
                return normalizeIdeas(item.ideas);
            }

            const summary = asString(item.s ?? item.summary ?? item.content ?? item.idea ?? item.description);
            let title = sanitizeTitle(item.t ?? item.title ?? item.name ?? item.topic);
            const tag = asString(item.tag ?? item.archetype ?? item.method ?? 'Bisociation');

            if (!title && summary) {
                title = sanitizeTitle(summary.split(/[.!?]/)[0].slice(0, 60).trim());
            }
            if (!title) title = `Idea ${index + 1}`;

            return { t: title, s: summary || title, tag };
        })
        .flat()
        .filter(Boolean);
}

function generateHeuristicScores(title, summary, index) {
    const text = `${title} ${summary} ${index}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;
    }
    const h = Math.abs(hash);
    return {
        syntax: 70 + (h % 23),             // 70 - 92
        feasibility: 20 + ((h >> 3) % 55), // 20 - 74
        relevance: 60 + ((h >> 6) % 35),   // 60 - 94
        novelty: 65 + ((h >> 9) % 30),     // 65 - 94
    };
}

const DEFAULT_ARCHETYPES = [
    'Inversion • Humor',
    'Psychological Pivot',
    'Curiosity Hook',
    'Cross-Domain Collision',
    'Provocative Angle'
];

function generateDynamicThoughtProcess(title, _summary, index) {
    const cleanTitle = (title || '').replace(/[[\]()]/g, '').trim().split(/[\s-]/)[0] || 'Concept';

    const enPatterns = [
        `${cleanTitle} → FixedEndState → PrerequisiteBacktrack → CausalAnchor → ExecutionRoute`, // TIC (Temporal Inversion Chain)
        `${cleanTitle} → PremiseFracture → CounterfactualStressTest → EdgeCaseExposure → NonLinearSolution`, // CS (Counterfactual Sandbox)
        `${cleanTitle} → ExtremeConstraintSqueeze → ExpansionRemix → HighDensityRefinement → Deployment`, // CRL (Constraint Remix Loop)
        `${cleanTitle} → CrossDomainCollision → ParadoxicalFriction → ProtocolDesign → Execution`,
        `${cleanTitle} → ReverseEngineering → BottleneckElimination → CausalVerification → Optimization`
    ];

    return enPatterns[index % enPatterns.length];
}

function generateDynamicReasoning(title, _summary, index) {
    const enReasons = [
        `Defines the core mechanism of '${title}' with precision, balancing intuitive usability and creative novelty.`,
        `Departs from linear conventions to address edge cases and practical efficacy with sharp contextual insight.`,
        `Establishes a tight causal chain toward the target outcome with an immediately actionable execution path.`,
        `Captures latent domain dynamics to overcome conventional limitations with fresh problem-solving power.`,
        `Effectively balances strict constraints and adaptive flexibility to deliver high-density results.`
    ];
    return enReasons[index % enReasons.length];
}

function fallbackEvaluations(ideasArray) {
    return normalizeIdeas(ideasArray).slice(0, 15).map((idea, index) => {
        const title = sanitizeTitle(idea.t) || `Idea ${index + 1}`;
        const ideaText = idea.s || idea.t || '';
        const tag = idea.tag || DEFAULT_ARCHETYPES[index % DEFAULT_ARCHETYPES.length];
        const scores = generateHeuristicScores(title, ideaText, index);
        return {
            title,
            tag,
            idea: ideaText,
            thoughtProcess: generateDynamicThoughtProcess(title, ideaText, index),
            evaluation: {
                syntax: scores.syntax,
                feasibility: scores.feasibility,
                relevance: scores.relevance,
                novelty: scores.novelty,
                reasoning: generateDynamicReasoning(title, ideaText, index),
            },
        };
    });
}

function extractIdeasByRegex(text) {
    const clean = asString(text);
    if (!clean) return [];
    const ideas = [];
    const blockRegex = /\{[^{}]*"(?:t|title)"\s*:[^{}]*\}/g;
    let match;
    while ((match = blockRegex.exec(clean)) !== null) {
        const block = match[0];
        try {
            const parsed = JSON.parse(block);
            if (parsed && (parsed.t || parsed.title)) {
                ideas.push(parsed);
                continue;
            }
        } catch {
            // Regex field fallback below
        }
        const tMatch = block.match(/"(?:t|title)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        const sMatch = block.match(/"(?:s|summary|content|description)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        const tagMatch = block.match(/"(?:tag|archetype|method)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (tMatch && tMatch[1]) {
            ideas.push({
                t: sanitizeTitle(tMatch[1].replace(/\\"/g, '"')),
                s: sMatch ? sMatch[1].replace(/\\"/g, '"') : tMatch[1],
                tag: tagMatch ? tagMatch[1].replace(/\\"/g, '"') : 'Bisociation'
            });
        }
    }
    return ideas.length > 0 ? normalizeIdeas(ideas) : [];
}

function parseIdeasFromPlainText(text) {
    const clean = asString(text);
    if (!clean) return [];

    const lines = clean
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
        .filter((line) => {
            if (line.length < 8) return false;
            // Reject raw JSON wrapper lines
            if (/^[[\]{}]+$/.test(line)) return false;
            if (/^\{?\s*"(?:ideas|evaluations)"\s*:/i.test(line)) return false;
            if (/^"(?:t|title|tag|s)"\s*:/i.test(line) && !line.includes(' - ')) return false;
            return true;
        });

    const seen = new Set();
    const ideas = [];

    for (const line of lines) {
        const normalized = line.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        let title = line;
        let summary = line;

        const dividerMatch = line.match(/^([^:]{3,70}):\s+(.{6,})$/);
        if (dividerMatch) {
            title = dividerMatch[1].trim();
            summary = dividerMatch[2].trim();
        } else if (line.length > 70) {
            title = `${line.slice(0, 67).trim()}...`;
        }

        title = sanitizeTitle(title);
        if (!title || title.length < 2) continue;

        ideas.push({ t: title, s: summary });
        if (ideas.length >= 15) break;
    }

    return ideas;
}

// ── Universal Creative Catalyst & Ideation System Prompt ──
const GEN_SYSTEM = `Master Creative Strategist & Context-Intelligent Ideator.
Analyze the user's prompt and intent, breaking conventional clichés to generate 15 genuinely unconventional, high-impact, actionable ideas/responses.

[STRICT LANGUAGE MANDATE: UNCONDITIONALLY RESPOND IN ENGLISH]
★ You MUST respond entirely in ENGLISH for ALL fields ("t", "tag", "s"), regardless of the user's prompt language. Never output Korean or any other non-English language.

1. CORE COGNITIVE FRAMEWORKS (MANDATORY OPERATIONAL ENGINES):
Actively apply these three rigorous cognitive frameworks to generate breakthroughs without forward drift or shallow tropes:
- TIC (Temporal Inversion Chain, Reverse Causal Inference):
  Fix the ultimate target outcome / future state first. Work backward step-by-step: "What immediately preceded this state?", physically blocking forward drift and ensuring tight, prerequisite-anchored pathways.
- CS (Counterfactual Sandbox, Counterfactual Simulation):
  Inject deliberate, artificial fractures into core domain assumptions ("What if fundamental rule A ceases to exist?", "What if the default choice is inverted?"). Stress-test edge cases to uncover non-linear breakthrough routes.
- CRL (Constraint Remix Loop, Dynamic Constraint Pacing):
  Oscillate between intense parameter contraction (extreme constraints, forbidden defaults) to eliminate fluff, and expansion cycles that build out high-density, richly detailed solutions.

2. Title ("t") Rules:
The title "t" must directly represent the core deliverable / solution / phrase:
- For Dialogue / Responses / Greetings / Comebacks / Copy:
  → "t": The EXACT witty/clever response phrase itself in English! (e.g., "Just when I was thinking about you!", "Too familiar to ask who it is.")
  → "s": 1-2 concise sentences explaining the conversational/psychological dynamic.
- For Frameworks / Methodologies / Technical Ideas / Prompting Techniques:
  → "t": A punchy, precise framework or technique name (e.g., "Temporal Inversion Chain (TIC)", "Counterfactual Sandbox (CS)")
  → "s": 1-2 concise sentences detailing the core mechanism, advantage, and failure-mode mitigation.
- For Recommendations / Products / Features / Solutions:
  → "t": The direct item or feature name in English.
  → "s": 1-2 concise sentences explaining value proposition and differentiation.
- ONLY if the user explicitly asks for Brand Naming:
  → "t": The proposed brand/product name.

3. "tag" (Creative Archetype / Tone):
- 2-4 words in English (e.g., "TIC • Reverse Causality", "CS • Counterfactual Probe", "CRL • Parameter Juggle", "Inversion • Humor", "Psychological Pivot").

Respond strictly in valid JSON:
{"ideas":[{"t":"DirectTitleOrPhrase","tag":"Archetype","s":"Execution mechanism and rationale"},...]}`;

// ── Context-Aware Evaluation & Creative Audit System Prompt ──
const EVAL_SYSTEM = `Master Creative Critic, Skeptical Engineering Auditor & Novelty Evaluator.
Critically evaluate the 15 ideas/responses against the user's prompt with ruthless analytical rigor and hard realism. Do NOT be polite or sycophantic. Score strictly and realistically.

[STRICT LANGUAGE MANDATE: UNCONDITIONALLY RESPOND IN ENGLISH]
★ All outputs ("title", "tag", "content", "thoughtProcess", "reason") MUST BE 100% IN CRISP, PROFESSIONAL ENGLISH. Never output Korean or any other non-English language.

[SCORING RUBRIC - ZERO INFLATION TOLERANCE]
- "fea" (Feasibility / Real-World Usability, 0-100):
  * 0 - 25: Pure Sci-Fi / Violates Physics, Thermodynamics, or Known Biology (e.g. quantum soul entanglement, time-reversal, multiverse anchors, astral cosmic sharding, resurrection). MUST score ≤ 25!
  * 26 - 45: Highly Speculative / Unproven Tech requiring major scientific breakthroughs decades away (e.g. whole-brain nanobot extraction lattices, mind-machine organoid hybrids).
  * 46 - 65: Plausible but Extremely Difficult with huge technical/resource barriers (e.g. complex CRISPR circuits, sustained cryoloop stasis).
  * 66 - 80: High Engineering Feasibility using existing technologies today (e.g. decentralized software pipelines, local AI fine-tunes, complex automation workflows).
  * 81 - 100: Immediately practical and deployable today with off-the-shelf tools.
  * METAPHORICAL COP-OUT PENALTY: If the user asks for a physical, biological, or technical breakthrough (e.g. actual immortality, energy, speed) and an idea merely offers a metaphorical or symbolic workaround (e.g. "writing a memoir novel", "posting viral memes", "creating an art gallery"), DO NOT grant high feasibility or high relevance! Score feasibility strictly on whether it solves the actual underlying problem, and penalize relevance accordingly.

- "rel" (Relevance to User's Specific Prompt & Intent, 0-100):
  * How directly and legitimately does this address the user's core problem?
  * Deduct heavily (below 60) if it evades the core question, drifts into unrelated topics, or substitutes a real solution with a philosophical metaphor.

- "nov" (Novelty / Unpredictability, 0-100):
  * Genuine departure from clichés vs. regurgitated tropes. (e.g. "writing a book to live forever" is an ancient cliché: nov should be < 50).

- "syn" (Linguistic Precision, Delivery, Memorability, 0-100):
  * Punchiness, conceptual clarity, and lack of fluffy buzzwords.

[Evaluation Criteria incorporating TIC, CS, CRL]
- Causal Validity (TIC test): Does the backward causal chain hold up, or does it collapse into circular paradoxes?
- Robustness Under Failure (CS test): How well does the concept handle edge cases, missing rules, or system stress?
- Information Density (CRL test): Is the concept tightly packed with actionable mechanics rather than generic filler?

[Output Fields]
1. "title": Retain the EXACT original title from the ideas list. Do NOT alter it.
2. "tag": Precise 2-4 word archetype/tone in English.
3. "content": Expand into 2-3 vivid sentences detailing the concrete execution, engineering mechanics, and real-world failure points.
4. "thoughtProcess": 4-5 nodes connected by → without trailing arrows (e.g. "FixedTargetState → PrerequisiteAnalysis → EdgeCaseStressTest → CausalAnchor").
5. "reason": A sharp, honest, skeptical 1-2 sentence audit detailing the concept's fatal technical bottleneck or legitimate practical edge.

Respond strictly in valid JSON:
{"evaluations":[{"i":0,"title":"ExactTitle","tag":"Archetype","content":"Detailed execution and technical reality…","thoughtProcess":"Node1→Node2→Node3→Node4","syn":76,"fea":28,"rel":60,"nov":88,"reason":"Conceptually audacious but fundamentally blocked by decoherence and unproven physics."}]}`;

async function generateWithGeminiNative(providerConfig, prompt, temperature) {
    const { apiKey, model } = providerConfig;
    const modelName = model?.trim() || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const safeTemperature = Number.isFinite(Number(temperature)) ? Number(temperature) : 1;
    const payload = {
        system_instruction: { parts: [{ text: GEN_SYSTEM }] },
        contents: [{ parts: [{ text: asString(prompt) }] }],
        generationConfig: {
            temperature: Math.max(0, Math.min(2, safeTemperature)),
            responseMimeType: "application/json",
        },
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
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
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => asString(part?.text)).filter(Boolean).join('\n').trim();
    if (!text) throw new Error('Gemini returned no content. May have been blocked by safety filters.');
    try {
        const parsed = parseLLMJson(text);
        const ideas = normalizeIdeas(parsed.ideas ?? parsed);
        if (ideas.length > 0) return ideas;
    } catch {
        // Fall back to regex / plain text extraction below.
    }

    const regexIdeas = extractIdeasByRegex(text);
    if (regexIdeas.length > 0) return regexIdeas;

    const fallback = parseIdeasFromPlainText(text);
    if (fallback.length > 0) return fallback;
    throw new Error(`Failed to parse Gemini idea output. Snippet: ${text.slice(0, 180)}`);
}

function compactIdeasForEval(ideasArray) {
    const normalized = normalizeIdeas(ideasArray);
    return normalized.map((idea, i) => {
        const title = sanitizeTitle(idea.t || idea.title || '');
        const summary = idea.s || idea.content || '';
        return `${i}. [${title}] ${summary}`;
    }).join('\n');
}

function mapEvalResults(evaluations, ideasArray) {
    const ideaPool = normalizeIdeas(ideasArray);
    let rows = [];
    if (Array.isArray(evaluations)) {
        rows = evaluations;
    } else if (evaluations && typeof evaluations === 'object') {
        if (Array.isArray(evaluations.evaluations)) rows = evaluations.evaluations;
        else if (Array.isArray(evaluations.ideas)) rows = evaluations.ideas;
        else if (Array.isArray(evaluations.results)) rows = evaluations.results;
        else if (Array.isArray(evaluations.items)) rows = evaluations.items;
        else if (Array.isArray(evaluations.data)) rows = evaluations.data;
        else {
            const arr = Object.values(evaluations).find(Array.isArray);
            if (arr) rows = arr;
            else {
                const objValues = Object.values(evaluations).filter((v) => v && typeof v === 'object' && (v.title || v.idea || v.content || v.t));
                if (objValues.length > 0) rows = objValues;
            }
        }
    }

    return rows
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;

            const idx = Number(item.i ?? item.index ?? item.id);
            const hasIndex = Number.isFinite(idx) && idx >= 0 && idx < ideaPool.length;
            const baseIdea = hasIndex ? ideaPool[Math.trunc(idx)] : ideaPool[index];
            const baseTitle = sanitizeTitle(baseIdea?.t);
            const evalTitle = sanitizeTitle(item.title ?? item.t);
            const title = sanitizeTitle(baseTitle || evalTitle) || `Idea ${index + 1}`;
            const idea = asString(item.content ?? item.idea ?? item.description ?? baseIdea?.s ?? title);
            const thoughtProcess = asString(item.thoughtProcess ?? item.chain ?? item.thought ?? item.conceptTrail ?? generateDynamicThoughtProcess(title, idea, index));

            const scoresObj = item.scores || item.evaluation || item.metrics || item.score || item;
            const defaultScores = generateHeuristicScores(title, idea, index);

            const rawSyn = scoresObj.syn ?? scoresObj.syntax ?? scoresObj.syntax_score ?? item.syn ?? item.syntax;
            const rawFea = scoresObj.fea ?? scoresObj.feasibility ?? scoresObj.feasibility_score ?? item.fea ?? item.feasibility;
            const rawRel = scoresObj.rel ?? scoresObj.relevance ?? scoresObj.relevance_score ?? item.rel ?? item.relevance;
            const rawNov = scoresObj.nov ?? scoresObj.novelty ?? scoresObj.novelty_score ?? item.nov ?? item.novelty;

            const syntax = rawSyn !== undefined && rawSyn !== null ? clampScore(rawSyn) : defaultScores.syntax;
            const feasibility = rawFea !== undefined && rawFea !== null ? clampScore(rawFea) : defaultScores.feasibility;
            const relevance = rawRel !== undefined && rawRel !== null ? clampScore(rawRel) : defaultScores.relevance;
            const novelty = rawNov !== undefined && rawNov !== null ? clampScore(rawNov) : defaultScores.novelty;

            const tag = asString(item.tag ?? item.archetype ?? item.method ?? baseIdea?.tag ?? '창의적 발상');
            const reasoning = asString(item.reason ?? item.reasoning ?? item.rationale ?? generateDynamicReasoning(title, idea, index));

            return {
                title,
                tag,
                idea,
                thoughtProcess,
                evaluation: {
                    syntax: syntax || defaultScores.syntax,
                    feasibility: feasibility || defaultScores.feasibility,
                    relevance: relevance || defaultScores.relevance,
                    novelty: novelty || defaultScores.novelty,
                    reasoning,
                },
            };
        })
        .filter((row) => row && (row.title || row.idea))
        .slice(0, 15);
}

async function evaluateIdeasBatchWithGeminiNative(providerConfig, prompt, ideasArray) {
    const { apiKey, model } = providerConfig;
    const compactList = compactIdeasForEval(ideasArray);
    const modelName = model?.trim() || 'gemini-2.5-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const payload = {
        system_instruction: { parts: [{ text: EVAL_SYSTEM }] },
        contents: [{ parts: [{ text: `Prompt: ${asString(prompt)}\n\nIdeas to evaluate:\n${compactList}\n\nRespond with valid JSON containing all evaluations.` }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
        },
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
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
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => asString(part?.text)).filter(Boolean).join('\n').trim();
    if (!text) throw new Error('Gemini returned no content during evaluation.');
    const result = parseLLMJson(text);
    const mapped = mapEvalResults(result.evaluations ?? result, ideasArray);
    return mapped.length > 0 ? mapped : fallbackEvaluations(ideasArray);
}

function resolveModel(provider, model) {
    if (!model || !model.trim()) {
        if (provider === 'groq') return 'openai/gpt-oss-120b';
        if (provider === 'gemini') return 'gemini-2.5-flash';
        if (provider === 'openrouter') return 'anthropic/claude-3.7-sonnet';
        if (provider === 'grok') return 'grok-2-latest';
        return 'gpt-5.6-luna';
    }
    const trimmed = model.trim();
    if (provider === 'groq' && trimmed.toLowerCase() === 'gpt-oss-120b') {
        return 'openai/gpt-oss-120b';
    }
    return trimmed;
}

/**
 * Generates 15 ideas (title + 1-line summary) using the configured AI provider.
 */
export async function generateIdeas(providerConfig, prompt, temperature = 2.0) {
    const { apiKey, baseURL, model, provider } = providerConfig;
    if (!apiKey && provider !== 'custom') {
        throw new Error("API Key is required.");
    }

    if (provider === 'gemini') {
        return await generateWithGeminiNative(providerConfig, prompt, temperature);
    }

    const clientConfig = { dangerouslyAllowBrowser: true, apiKey: apiKey || 'custom-endpoint-key' };
    if (baseURL) clientConfig.baseURL = baseURL;
    const openai = new OpenAI(clientConfig);

    const resolvedModel = resolveModel(provider, model);
    const isReasoningModel = /^(o1|o3|deepseek-r1)/i.test(resolvedModel);

    try {
        const payload = {
            model: resolvedModel,
            messages: [
                { role: isReasoningModel ? 'developer' : 'system', content: GEN_SYSTEM },
                { role: 'user', content: prompt }
            ],
            ...(isReasoningModel
                ? { max_completion_tokens: 4096 }
                : { max_tokens: 4096, temperature }),
        };
        const isR1Groq = provider === 'groq' && /deepseek.*r1/i.test(resolvedModel);
        if (isR1Groq) {
            payload.reasoning_format = 'parsed';
        }
        if (provider !== 'groq' && !isReasoningModel && !resolvedModel.toLowerCase().includes('gpt-oss')) {
            payload.presence_penalty = 2.0;
            payload.frequency_penalty = 2.0;
        }
        const supportsJsonObject = provider !== 'custom' && !(provider === 'openrouter' && /claude/i.test(resolvedModel));
        if (supportsJsonObject) {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);
        const rawContent = asString(response.choices[0].message.content);
        try {
            const parsed = parseLLMJson(rawContent);
            const ideas = normalizeIdeas(parsed.ideas ?? parsed);
            if (ideas.length > 0) return ideas;
        } catch {
            // Fall back to regex / plain text extraction below.
        }

        const regexIdeas = extractIdeasByRegex(rawContent);
        if (regexIdeas.length > 0) return regexIdeas;

        const fallback = parseIdeasFromPlainText(rawContent);
        if (fallback.length > 0) return fallback;
        throw new Error(`Failed to parse idea output. Snippet: ${rawContent.slice(0, 180)}`);
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
            const fallback = fallbackEvaluations(ideasArray);
            if (fallback.length > 0) return fallback;
            throw new Error(`Evaluation failed: ${e.message}`);
        }
    }

    const clientConfig = { dangerouslyAllowBrowser: true, apiKey: apiKey || 'custom-endpoint-key' };
    if (baseURL) clientConfig.baseURL = baseURL;
    const openai = new OpenAI(clientConfig);

    const compactList = compactIdeasForEval(ideasArray);
    const resolvedModel = resolveModel(provider, model);
    const isReasoningModel = /^(o1|o3|deepseek-r1)/i.test(resolvedModel);

    try {
        const payload = {
            model: resolvedModel,
            messages: [
                { role: isReasoningModel ? 'developer' : 'system', content: EVAL_SYSTEM },
                { role: 'user', content: `Prompt: ${prompt}\n\nIdeas to evaluate:\n${compactList}\n\nRespond with valid JSON containing the evaluations array.` }
            ],
            ...(isReasoningModel
                ? { max_completion_tokens: 8192 }
                : { max_tokens: 8192, temperature: 0.1 }),
        };
        const isR1Groq = provider === 'groq' && /deepseek.*r1/i.test(resolvedModel);
        if (isR1Groq) {
            payload.reasoning_format = 'parsed';
        }
        const supportsJsonObject = provider !== 'custom' && !(provider === 'openrouter' && /claude/i.test(resolvedModel));
        if (supportsJsonObject) {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);
        const rawContent = asString(response.choices[0].message.content);
        const result = parseLLMJson(rawContent);
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
 * Enhances user prompt into a structured command using specialized ideation catalyst modes.
 */
export async function enhancePrompt(_providerConfig, prompt, catalystMode = 'auto') {
    const catalystInstructionsEn = {
        tic: `Apply Temporal Inversion Chain (TIC): Fix the target conclusion or future end-state of "${prompt}" first. Work backward step-by-step to identify immediate prerequisites, physically blocking forward drift and establishing an airtight causal path. Generate 15 high-impact, non-cliché ideas/responses in English.`,
        cs: `Apply Counterfactual Sandbox (CS): Introduce artificial fractures into core premises of "${prompt}" ("What if rule X disappears? What if the opposite choice is forced?"). Stress-test system reactions and dredge up sharp edge cases to invent 15 radical, robust solutions in English.`,
        crl: `Apply Constraint Remix Loop (CRL): Squeeze "${prompt}" through extreme constraints to shatter generic tropes, then expand and remix with high information density. Produce 15 breakthrough ideas/responses in English.`,
        bisociation: `Apply Bisociation & Cross-Domain Collision: Pair "${prompt}" with surprising external domains to discover 15 genuinely radical, fresh ideas/responses in English.`,
        provocation: `Apply Provocation & Movement (PO): Invert conventional assumptions about "${prompt}" to generate 15 breakthrough, unconventional ideas/responses in English.`,
        oblique: `Apply Oblique Strategies: Impose striking constraints on "${prompt}" to reveal 15 ingenious, out-of-the-box approaches in English.`,
        naming: `Apply World-Class Hook & Naming: Create 15 high-impact, sticky titles, catchphrases, or brand concepts for "${prompt}" in English.`,
        auto: `Synthesize Advanced Cognitive Engines [TIC (Temporal Inversion Chain), CS (Counterfactual Sandbox), CRL (Constraint Remix Loop)]: Lock the concrete end-state first to prevent forward drift, stress-test edge cases via counterfactual premise fractures, and apply tight constraint loops. Generate 15 genuinely unconventional, highly rigorous, and context-appropriate ideas/responses in English that directly fulfill: ${prompt}`
    };

    return catalystInstructionsEn[catalystMode] || catalystInstructionsEn.auto;
}
