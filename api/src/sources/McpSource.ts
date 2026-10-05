import { object, string, type Evidence, type EvidenceSource, type Lang } from '../types';
import type { Fetcher } from '../http';
import { approvedUrl } from '../retrieve';
import { QuranEncSource } from './QuranEncSource';
export class McpSource implements EvidenceSource {
  private nextId = 0;
  constructor(private fetcher: Fetcher = (url, init) => fetch(url, init)) {}
  private async rpc(method: string, params: unknown): Promise<Record<string, unknown>> {
    const id = ++this.nextId;
    const response = await this.fetcher('https://mcp.islamiccontent.org/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-03-26' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal: AbortSignal.timeout(12000) });
    if (!response.ok) { console.warn('BASIRA_MCP_HTTP_ERROR', response.status); throw new Error('MCP request failed'); }
    const body = await response.text();
    const messages: unknown[] = response.headers.get('Content-Type')?.includes('text/event-stream')
      ? body.replace(/\r\n/g, '\n').split('\n\n').flatMap(event => { const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'); return data ? [JSON.parse(data)] : []; }) : [JSON.parse(body)];
    const message = messages.map(object).find(message => message.id === id);
    if (!message || message.error) throw new Error('MCP protocol failed');
    return object(message.result);
  }
  private async call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.rpc('tools/call', { name, arguments: args });
    if (result.isError) throw new Error('MCP tool failed');
    const content = Array.isArray(result.content) ? result.content.map(object) : [];
    if (content.some(block => typeof block.text === 'string' && /(?:quran|hadith|library):\s*unavailable|timed out|upstream.*(?:failed|error)/i.test(block.text))) throw new Error('MCP partial failure');
    if (result.structuredContent) return object(result.structuredContent);
    for (const block of content) { if (block.type === 'text' && typeof block.text === 'string') { try { return object(JSON.parse(block.text)); } catch { /* try next block */ } } }
    throw new Error('MCP missing structured response');
  }
  async search(query: string, lang: Lang): Promise<Evidence[]> {
    await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'basira', version: '0.2.0' } });
    const initialized = await this.fetcher('https://mcp.islamiccontent.org/mcp', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-03-26' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(12000),
    });
    if (!initialized.ok) throw new Error('MCP initialization failed');
    await initialized.body?.cancel();
    const result = await this.call('search', { query, language: lang, limit: 5 });
    if (!Array.isArray(result.results)) throw new Error('Invalid MCP search');
    return Promise.all(result.results.slice(0, 5).map(async hit => {
      const record = object(hit), doc = await this.call('fetch', { id: string(record.id) });
      if (doc.id !== record.id) throw new Error('Mismatched MCP document');
      const source = string(object(doc.metadata).source);
      if (!['QuranEnc', 'HadeethEnc', 'IslamHouse'].includes(source)) throw new Error('Unapproved source');
      if (source === 'QuranEnc' && new URL(string(doc.url)).hostname === 'islamenc.com') {
        // The MCP now links Quran hits to another domain. Fetch the verse anew
        // from approved QuranEnc instead of relabelling unapproved evidence.
        const metadata = object(doc.metadata);
        if (!Number.isInteger(metadata.surah) || !Number.isInteger(metadata.aya)) throw new Error('Invalid Quran metadata');
        const evidence = await new QuranEncSource(this.fetcher).search(`Quran ${metadata.surah}:${metadata.aya}`, lang);
        if (evidence.length !== 1) throw new Error('Approved Quran evidence unavailable');
        return evidence[0];
      }
      return { title: string(doc.title), url: approvedUrl(doc.url), snippet: string(doc.text), source };
    }));
  }
}
