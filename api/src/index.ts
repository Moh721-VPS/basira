export type ClaimStatus = 'SUPPORTED' | 'NEEDS_MORE_VERIFICATION' | 'REFER_TO_SPECIALIST';
export type InternalStatus = ClaimStatus | 'SYSTEM_ERROR';
export type VerifyResponse = { claims: { id: string; text: string; status: ClaimStatus; evidence: { id: string; title: string; url: string; snippet: string }[]; note: string }[] };

export default {
  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/verify') return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (request.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: { Allow: 'POST' } });
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'EXPECTED_JSON' }, { status: 415 });
    try {
      let body: unknown;
      try { body = await request.json(); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
      if (typeof body !== 'object' || body === null || !('text' in body) || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 10000) return Response.json({ error: 'INVALID_TEXT', message: 'Provide non-empty text up to 10000 characters.' }, { status: 400 });
      // Scaffold only: echo the input as one mock item. No claim extraction,
      // retrieval, LLM call, source approval, or verification is performed.
      const result: VerifyResponse = { claims: [{ id: 'C1', text: body.text.trim(), status: 'NEEDS_MORE_VERIFICATION', evidence: [{ id: 'E1', title: 'Mock evidence — example only', url: 'https://example.com/', snippet: 'Placeholder evidence. This does not support or refute the submitted text.' }], note: 'MOCK DATA: no verification was performed. بيانات تجريبية: لم يُجرَ أي تحقق.' }] };
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      // Infrastructure failures remain separate from claim judgments.
      return Response.json({ error: 'SYSTEM_ERROR' }, { status: 500 });
    }
  },
};
