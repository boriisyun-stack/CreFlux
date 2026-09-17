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
                return { t: title, s: summary, tag: 'Bisociation' };
            }
            if (!item || typeof item !== 'object') return null;

            const summary = asString(item.s ?? item.summary ?? item.content ?? item.idea ?? item.description);
            let title = asString(item.t ?? item.title ?? item.name ?? item.topic);
            const tag = asString(item.tag ?? item.archetype ?? item.method ?? 'Bisociation');

            if (!title && summary) {
                title = summary.split(/[.!?]/)[0].slice(0, 60).trim();
            }
            if (!title) title = `Idea ${index + 1}`;

            return { t: title, s: summary || title, tag };
        })
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
        syntax: 75 + (h % 21),         // 75 - 95
        feasibility: 60 + ((h >> 3) % 31), // 60 - 90
        relevance: 78 + ((h >> 6) % 20),   // 78 - 97
        novelty: 68 + ((h >> 9) % 28),     // 68 - 95
    };
}

const DEFAULT_ARCHETYPES = [
    '역발상 • 유머',
    '심리적 반전',
    '호기심 유발',
    '이종 결합 • 은유',
    '파격적 위트'
];

function fallbackEvaluations(ideasArray) {
    const verdictPhrases = [
        '기존의 상투적인 방식을 깨뜨리는 역발상과 높은 실전 적용성을 갖춘 참신한 접근입니다.',
        '청자의 호기심과 반응을 즉각적으로 이끌어내는 심리적 매력과 독창적인 차별성이 돋보입니다.',
        '직관적이면서도 군더더기 없는 전개로 상황에 즉시 활용하기 적합한 아이디어입니다.',
        '클리셰를 비틀어 대화의 주도권과 강렬한 인상을 남기는 뛰어난 표현력을 지니고 있습니다.'
    ];

    return normalizeIdeas(ideasArray).slice(0, 15).map((idea, index) => {
        const title = idea.t || `Idea ${index + 1}`;
        const ideaText = idea.s || idea.t || '';
        const tag = idea.tag || DEFAULT_ARCHETYPES[index % DEFAULT_ARCHETYPES.length];
        const scores = generateHeuristicScores(title, ideaText, index);
        return {
            title,
            tag,
            idea: ideaText,
            thoughtProcess: `${(title.split(/[\s-]/)[0] || '발상')}→고정관념탈피→심리적접근→핵심실행`,
            evaluation: {
                syntax: scores.syntax,
                feasibility: scores.feasibility,
                relevance: scores.relevance,
                novelty: scores.novelty,
                reasoning: verdictPhrases[index % verdictPhrases.length],
            },
        };
    });
}

function parseIdeasFromPlainText(text) {
    const clean = asString(text);
    if (!clean) return [];

    const lines = clean
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
        .filter((line) => line.length >= 8);

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

        ideas.push({ t: title, s: summary });
        if (ideas.length >= 15) break;
    }

    return ideas;
}

// ── Universal Creative Catalyst & Ideation System Prompt ──
const GEN_SYSTEM = `Master Creative Strategist & Context-Intelligent Ideator.
사용자의 질문과 의도를 정확하게 파악하여, 뻔하고 상투적인 답변을 깨뜨리는 기발하고 실전성 높은 15가지 아이디어/답변을 도출하라.

[핵심 원칙: 제목 "t"는 가짜 브랜드명이 아니라, 사용자가 요구한 '실제 결과물 자체'여야 함]
★ "PingHue", "QuantumYo", "HiFlux" 같은 뜬금없는 영어 스타트업/기술 코드명을 절대로 만들어내지 마라! (사용자가 명시적으로 영어 브랜드 네이밍을 요구한 경우 제외)

1. 질문 유형별 "t" (제목) 작성 규칙:
- 대화 / 답변 / 멘트 / 카톡 답장 / 인사 / 카피 요청 시 (예: "Hi의 대답", "소개팅 첫인사", "거절 멘트"):
  → "t": 실제로 말할 '구체적인 답변/멘트 문장 자체'!
    (예: "안녕? 마침 네 생각하고 있었는데!", "누구세요? 라고 하기엔 너무 반가운 얼굴이네", "오늘 무슨 좋은 일 있어?")
  → "s": 이 답변이 상대의 심리를 어떻게 움직이고 대화 주도권을 잡는지 1~2문장으로 설명.
- 메뉴 / 음식 / 선물 / 장소 / 아이템 추천 요청 시 (예: "점심 메뉴 골라줘", "선물 추천"):
  → "t": 추천하는 '구체적인 아이템/메뉴 이름 자체'! (예: "얼큰 김치 차돌 칼국수", "온열 무선 목 마사지기")
  → "s": 왜 이 선택이 매력적이고 상황에 딱 맞는지 1~2문장으로 설명.
- 기획 / 솔루션 / 비즈니스 / 앱 아이디어 요청 시:
  → "t": 핵심을 직관적으로 드러내는 명확한 컨셉 제목 (예: "잔반 스캔 기반 개인 맞춤 식단 AI")
  → "s": 1~2문장의 핵심 메커니즘 및 파격적 차별점.
- 오직 사용자가 명시적으로 '이름/브랜드명/작명'을 요구한 경우에만:
  → "t": 제안하는 매력적인 브랜드/제품명.

2. 언어 일치 원칙 (절대 준수):
- 사용자의 프롬프트 언어와 100% 동일한 언어로 응답하라.
- 한국어 프롬프트에는 제목("t"), 태그("tag"), 내용("s") 모두 자연스럽고 생생한 한국어로만 작성하라. 불필요한 영어 남발 금지.

3. "tag" (발상 기법/톤앤매너):
- 각 아이디어의 발상 특징을 2~4단어로 표현 (예: "기분 좋은 훅", "심리적 반전", "유쾌한 도발", "호기심 유발", "공감형 위트", "역발상").

반드시 유효한 JSON 형식으로 응답하라:
{"ideas":[{"t":"실제답변문장또는직관적핵심제목","tag":"발상기법","s":"구체적 설명 및 심리적/실전적 효과"},...]}`;

// ── Context-Aware Evaluation & Creative Audit System Prompt ──
const EVAL_SYSTEM = `Master Creative Critic & Context-Aware Evaluator.
제공된 15개 아이디어/답변을 사용자의 원래 질문 의도에 맞춰 날카롭게 분석하고 평가하라.

[평가 및 확장 규칙]
1. 언어: 사용자의 프롬프트 및 아이디어 목록과 동일한 언어로 응답하라 (한국어 요청은 100% 한국어로).
2. "title": 아이디어 목록에 제공된 원래의 제목/멘트를 '그대로' 유지하라. 임의로 영어 코드명이나 엉뚱한 이름으로 변경 절대 금지!
3. "tag": 발상 유형/톤 (예: "심리적 반전", "유쾌한 도발", "공감형 위트", "기분 좋은 훅").
4. "content": 실제 적용 시나리오, 구체적 대화 흐름, 심리적 반응, 실전 팁을 생생한 2~3문장으로 확장하라.
5. "thoughtProcess": 발상의 인과 흐름을 4~5개 노드로 화살표(→) 연결 (예: "상투적 인사 탈피 → 호기심 자극 → 심리적 핑퐁 → 대화 주도권"). 끝에 남는 화살표가 없어야 함.
6. 점수 (0-100 정수):
   - syn (전달력/말맛/임팩트): 표현의 매력도, 흡인력, 기억에 남는 정도
   - fea (실전 활용성): 실생활이나 상황에서 얼마나 자연스럽고 효과적으로 쓸 수 있는지
   - rel (의도 적합성): 사용자의 질문 의도에 얼마나 정확하게 부합하는지
   - nov (참신성/독창성): 뻔한 클리셰를 벗어난 신선한 발상인지
7. "reason": 왜 이 답변/아이디어가 효과적인지, 어떤 심리적/실전적 차별점이 있는지 핵심을 찌르는 1~2문장 심사평.

반드시 다음 JSON 스키마로 출력하라:
{"evaluations":[{"i":0,"title":"원래제목그대로","tag":"태그","content":"상세 실행 및 시나리오 2~3문장","thoughtProcess":"노드1→노드2→노드3→노드4","syn":88,"fea":90,"rel":95,"nov":85,"reason":"핵심 심사평"}]}`;

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
        // Fall back to plain text extraction below.
    }

    const fallback = parseIdeasFromPlainText(text);
    if (fallback.length > 0) return fallback;
    throw new Error(`Failed to parse Gemini idea output. Snippet: ${text.slice(0, 180)}`);
}

function compactIdeasForEval(ideasArray) {
    const normalized = normalizeIdeas(ideasArray);
    return normalized.map((idea, i) => {
        const title = idea.t || idea.title || '';
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
            const baseTitle = asString(baseIdea?.t);
            const evalTitle = asString(item.title ?? item.t);
            const title = baseTitle || evalTitle || `Idea ${index + 1}`;
            const idea = asString(item.content ?? item.idea ?? item.description ?? baseIdea?.s ?? title);
            const thoughtProcess = asString(item.thoughtProcess ?? item.chain ?? item.thought ?? item.conceptTrail ?? `${(title.split(/[\s-]/)[0] || '발상')}→고정관념탈피→심리적접근→핵심실행`);

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

            const tag = asString(item.tag ?? item.archetype ?? item.method ?? baseIdea?.tag ?? '역발상');
            const reasoning = asString(item.reason ?? item.reasoning ?? item.rationale ?? '상투적인 틀을 벗어나 실전 활용성과 전달력을 고루 갖춘 제안입니다.');

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
            maxOutputTokens: 4096,
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
        if (provider === 'groq') {
            payload.reasoning_format = 'parsed';
        }
        if (provider !== 'groq' && !isReasoningModel && !resolvedModel.toLowerCase().includes('gpt-oss')) {
            payload.presence_penalty = 2.0;
            payload.frequency_penalty = 2.0;
        }
        if (provider !== 'custom') {
            payload.response_format = { type: 'json_object' };
        }

        const response = await openai.chat.completions.create(payload);
        const rawContent = asString(response.choices[0].message.content);
        try {
            const parsed = parseLLMJson(rawContent);
            const ideas = normalizeIdeas(parsed.ideas ?? parsed);
            if (ideas.length > 0) return ideas;
        } catch {
            // Fall back to plain-text extraction below.
        }

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
                ? { max_completion_tokens: 4096 }
                : { max_tokens: 4096, temperature: 0.1 }),
        };
        if (provider === 'groq') {
            payload.reasoning_format = 'parsed';
        }
        if (provider !== 'custom') {
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
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt);

    const catalystInstructionsKo = {
        bisociation: `[이종 결합 / Bisociation]: "${prompt}"의 본질을 분석하고, 의외의 영역과 충돌시켜 상투적이지 않고 가장 기발한 15가지 창의적 해결책/답변/아이디어를 제시하라.`,
        provocation: `[역발상 및 도발 / PO]: "${prompt}"에 대한 모든 당연한 상식과 고정관념을 뒤집어, 기존의 뻔한 방식을 박살 내는 15가지 파격적인 발상을 도출하라.`,
        oblique: `[사선 전략 / Oblique]: "${prompt}"에 예상치 못한 극단적 제약이나 독특한 앵글을 적용하여, 아무도 생각하지 못한 영리한 15가지 방식을 발견하라.`,
        naming: `[매력적 작명 & 카피 / Naming & Hook]: "${prompt}"에 가장 강력하게 각인되는 15가지 매혹적인 네이밍, 후킹 카피, 또는 멘트를 고안하라.`,
        auto: `"${prompt}"에 대해 사용자의 의도를 정확히 꿰뚫고, 고정관념을 깬 가장 참신하고 실전 효과가 뛰어난 15가지 아이디어/답변/접근법을 도출하라.`
    };

    const catalystInstructionsEn = {
        bisociation: `Apply Bisociation & Cross-Domain Collision: Pair "${prompt}" with surprising external fields to discover 15 genuinely radical, fresh ideas/responses.`,
        provocation: `Apply Provocation & Movement (PO): Invert conventional assumptions about "${prompt}" to generate 15 breakthrough, unconventional ideas/responses.`,
        oblique: `Apply Oblique Strategies: Impose striking constraints on "${prompt}" to reveal 15 ingenious, out-of-the-box approaches.`,
        naming: `Apply World-Class Hook & Naming: Create 15 high-impact, sticky titles, catchphrases, or brand concepts for "${prompt}".`,
        auto: `Generate 15 genuinely unconventional, highly creative, and context-appropriate ideas/responses that directly fulfill: ${prompt}`
    };

    const instructions = isKorean ? catalystInstructionsKo : catalystInstructionsEn;
    return instructions[catalystMode] || instructions.auto;
}
