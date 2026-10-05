import { object, string, type Env, type JsonModel } from './types';
import type { Fetcher } from './http';
export class Gemini implements JsonModel {
  constructor(private env: Env, private fetcher: Fetcher = (url, init) => fetch(url, init)) {}
  async generate(instruction: string, input: unknown, schema: Record<string, unknown>): Promise<unknown> {
    const key = this.env.GEMINI_API_KEY?.trim(), model = this.env.GEMINI_MODEL?.trim();
    if (!key || !model || !/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Missing Gemini configuration');
    const init: RequestInit = {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }], generationConfig: { temperature: 0, ...(/^gemini-3[.-]/.test(model) ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}), responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema } } } }),
    };
    let response: Response;
    for (let attempt = 0; ; attempt++) {
      response = await this.fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, init);
      if (![502, 503, 504].includes(response.status) || attempt === 2) break;
      await response.body?.cancel();
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    // Never expose upstream bodies, prompts, or credentials in errors/logs.
    if (!response.ok) throw new Error('Gemini request failed');
    const data = object(await response.json());
    if (!Array.isArray(data.candidates) || data.candidates.length !== 1) throw new Error('Invalid Gemini response');
    const candidate = object(data.candidates[0]);
    if (candidate.finishReason !== 'STOP') throw new Error('Incomplete Gemini response');
    const parts = object(candidate.content).parts;
    if (!Array.isArray(parts)) throw new Error('Invalid Gemini response');
    const text = parts.filter(part => object(part).thought !== true).map(part => string(object(part).text)).join('');
    return JSON.parse(text);
  }
}
