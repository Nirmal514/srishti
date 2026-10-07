import { createServerFn } from "@tanstack/react-start";
import { requireLocalAuth } from "@/integrations/local-auth";
import { saveSeedForUser } from "@/lib/local-backend";
import type { QA, Research } from "./shrishti-types";

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

type Schema = Record<string, unknown>;
const str = { type: "string" };
const obj = (props: Record<string, unknown>): Schema => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(props),
  properties: props,
});
const arr = (items: unknown) => ({ type: "array", items });

export const RESEARCH_SCHEMA = obj({
  summary: str,
  branches: arr(
    obj({
      name: str,
      nodes: arr(obj({ label: str, detail: str, certainty: { type: "string", enum: ["known", "probable", "possible", "uncertain"] } })),
    }),
  ),
  problems: arr(
    obj({
      title: str,
      what: str,
      why: str,
      severity: { type: "integer" },
      urgency: { type: "string", enum: ["immediate", "near-term", "long-term"] },
      branches: arr(str),
    }),
  ),
  reasoning: arr(
    obj({
      title: str,
      links: arr(obj({ from: str, relation: str, to: str, why: str, evidence: str, assumptions: str, uncertainty: str })),
    }),
  ),
  limitations: str,
});

export const QA_SCHEMA = obj({ answer: str, branches: arr(str), grounded: { type: "boolean" } });

const GEMINI_BASE_URL = (process.env['GEMINI_API_BASE'] || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
const OPENAI_BASE_URL = (process.env['OPENAI_BASE_URL'] || 'https://api.openai.com/v1').replace(/\/+$/, '');

function resolveAIConfig() {
  const geminiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
  if (geminiKey) {
    return {
      provider: 'gemini' as const,
      apiKey: geminiKey,
      baseUrl: GEMINI_BASE_URL,
      model: process.env['GEMINI_MODEL'] || DEFAULT_GEMINI_MODEL,
    };
  }

  const openAiKey = process.env['OPENAI_API_KEY'];
  if (openAiKey) {
    return {
      provider: 'openai' as const,
      apiKey: openAiKey,
      baseUrl: OPENAI_BASE_URL,
      model: process.env['OPENAI_MODEL'] || DEFAULT_OPENAI_MODEL,
    };
  }

  throw new Error('AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to your environment.');
}

async function callAI(system: string, user: string, name: string, schema: Schema): Promise<unknown> {
  const { provider, apiKey, baseUrl, model } = resolveAIConfig();

  if (provider === 'gemini') {
    const fallbackModel = process.env['GEMINI_FALLBACK_MODEL'] || DEFAULT_GEMINI_FALLBACK_MODEL;
    const models = [...new Set([model, fallbackModel])];
    let lastError = '';

    for (const [index, currentModel] of models.entries()) {
      const url = `${baseUrl}/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system }],
          },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
        if (!text) {
          throw new Error('Gemini returned an empty response.');
        }

        return JSON.parse(text);
      }

      const responseText = await res.text();
      console.error('Gemini AI error', res.status, responseText);
      let apiMessage = '';
      try {
        const payload = JSON.parse(responseText) as { error?: { message?: string } };
        apiMessage = payload.error?.message ?? '';
      } catch {
        apiMessage = '';
      }

      const retryable = res.status === 404 || res.status === 429 || res.status >= 500;
      if (index < models.length - 1 && retryable) {
        console.warn(`Gemini model ${currentModel} returned ${res.status}; retrying with ${fallbackModel}.`);
        lastError = apiMessage || `Gemini request failed (${res.status}).`;
        continue;
      }

      lastError = apiMessage || `Gemini request failed (${res.status}).`;
      throw new Error(`Gemini API error: ${lastError}`);
    }

    throw new Error(`Gemini API error: ${lastError || 'No configured model could complete the request.'}`);
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (res.status === 429) throw new Error('Too many requests right now — please wait a moment and try again.');
  if (res.status === 402) throw new Error('AI credits are exhausted. Please add credits to continue.');
  if (!res.ok) {
    const t = await res.text();
    console.error('AI error', res.status, t);
    throw new Error(`Research failed (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  const rawText =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => part.text ?? '').join('')
        : '';

  if (!rawText) {
    throw new Error('AI returned an empty response.');
  }

  return JSON.parse(rawText);
}

const RESEARCH_SYSTEM = `You are SHRISHTI's research engine. A user plants a "seed" topic; you unfold it into a structured, honest knowledge tree.
Rules: never invent statistics, studies, sources, or dates you are not confident about. Mark each node's certainty as "known", "probable", "possible" or "uncertain". Represent disputes explicitly. Be concise: each detail max 2 sentences.
Return JSON with this shape:
{"summary":string (2 sentences),
"branches":[{"name":string,"nodes":[{"label":string (max 5 words),"detail":string,"certainty":"known"|"probable"|"possible"|"uncertain"}]}],
"problems":[{"title":string,"what":string,"why":string,"severity":1-5,"urgency":"immediate"|"near-term"|"long-term","branches":[branch names]}],
"reasoning":[{"title":string,"links":[{"from":string,"relation":string,"to":string,"why":string,"evidence":string,"assumptions":string,"uncertainty":string}]}],
"limitations":string}
Produce 8-12 branches (e.g. origin, causes, mechanism, human impact, economy, environment, history, prediction, risk, solutions, future, related concepts — adapt to the topic), 3-6 nodes each, 4-7 significant problems only, and 2-3 reasoning chains of 4-7 links.`;

export const unfoldSeed = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((d: { seed: string }) => {
    const seed = String(d?.seed ?? "").trim().slice(0, 120);
    if (!seed) throw new Error("Enter a seed first");
    return { seed };
  })
  .handler(async ({ data, context }) => {
    const r = (await callAI(RESEARCH_SYSTEM, `Seed: ${data.seed}`, "knowledge_tree", RESEARCH_SCHEMA)) as Research;
    const research: Research = {
      seed: data.seed,
      summary: r.summary ?? "",
      branches: Array.isArray(r.branches) ? r.branches.filter((b) => b && Array.isArray(b.nodes)) : [],
      problems: Array.isArray(r.problems) ? r.problems : [],
      reasoning: Array.isArray(r.reasoning) ? r.reasoning.filter((c) => Array.isArray(c?.links)) : [],
      limitations: r.limitations ?? "",
    };
    await saveSeedForUser(String(context.userId ?? ''), data.seed, research);
    return research;
  });

export const askJigyasa = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((d: { question: string; research: Research }) => {
    const question = String(d?.question ?? "").trim().slice(0, 500);
    if (!question) throw new Error("Ask a question");
    if (!d?.research?.seed) throw new Error("Unfold a seed first");
    return { question, research: d.research };
  })
  .handler(async ({ data }) => {
    const system = `You are Jigyasa, SHRISHTI's search engine. Answer ONLY using the provided knowledge tree for the current seed. Connect information across branches when useful. If the tree does not contain enough information, say "The current seed does not contain enough information to answer this." and set grounded=false. Keep answers under 120 words.
Return ONLY JSON: {"answer":string,"branches":[names of branches used],"grounded":boolean}`;
    const r = (await callAI(
      system,
      `Knowledge tree:\n${JSON.stringify(data.research).slice(0, 24000)}\n\nQuestion: ${data.question}`,
      "jigyasa_answer",
      QA_SCHEMA,
    )) as Partial<QA>;
    return {
      question: data.question,
      answer: r.answer ?? "No answer.",
      branches: Array.isArray(r.branches) ? r.branches : [],
      grounded: r.grounded !== false,
    } satisfies QA;
  });
