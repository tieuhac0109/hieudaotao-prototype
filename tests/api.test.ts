import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET as healthHandler } from '../src/app/api/health/route';
import { POST as analyzeHandler } from '../src/app/api/analyze/route';
import * as providerModule from '../src/lib/ai/provider';
import { AIProviderError, ConfigurationError } from '../src/lib/ai/errors';

describe('API Route Hardening & Secret-Safe Error Handling', () => {
  const samplePdfPath = path.resolve(__dirname, '../public/sample-docs/quy-che-dao-tao-mau.pdf');
  const samplePdfBuffer = fs.readFileSync(samplePdfPath);
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return honest provider status distinguishing implemented vs configured vs liveValidated', async () => {
      delete process.env.VERTEX_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await healthHandler();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('healthy');

      // Vertex: implemented, unconfigured in test env, live validated milestone
      expect(json.prototype.providers.vertex.adapterImplemented).toBe(true);
      expect(json.prototype.providers.vertex.configured).toBe(false);
      expect(json.prototype.providers.vertex.liveValidated).toBe(true);

      // Anthropic: implemented, unconfigured in test env, unvalidated
      expect(json.prototype.providers.anthropic.adapterImplemented).toBe(true);
      expect(json.prototype.providers.anthropic.configured).toBe(false);
      expect(json.prototype.providers.anthropic.liveValidated).toBe(false);

      // Verify no secrets, billing IDs, or internal tokens exist in response
      const jsonStr = JSON.stringify(json);
      expect(jsonStr).not.toContain('secret_val_123');
      expect(jsonStr).not.toContain('Bearer');
      expect(jsonStr).not.toContain('PRIVATE_KEY');
    });

    it('should never expose real secret values when credentials are configured in runtime', async () => {
      process.env.VERTEX_API_KEY = 'secret_vertex_key_999';
      process.env.ANTHROPIC_API_KEY = 'secret_anthropic_key_888';

      const response = await healthHandler();
      const json = await response.json();

      expect(json.prototype.providers.vertex.configured).toBe(true);
      expect(json.prototype.providers.anthropic.configured).toBe(false); // Anthropic still needs model

      const jsonStr = JSON.stringify(json);
      expect(jsonStr).not.toContain('secret_vertex_key_999');
      expect(jsonStr).not.toContain('secret_anthropic_key_888');
    });
  });

  describe('POST /api/analyze', () => {
    it('should reject requests with invalid content-type', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ question: 'Test' }),
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject requests with invalid or missing question', async () => {
      const formData = new FormData();
      formData.append('question', 'a'); // too short (< 3 chars)
      formData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'test.pdf');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('INVALID_QUESTION');
    });

    it('should reject requests with missing PDF file', async () => {
      const formData = new FormData();
      formData.append('question', 'Điều kiện tốt nghiệp là gì?');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('MISSING_FILE');
    });

    it('should return safe 503 response and sanitize server logs when AI provider is not configured', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(providerModule, 'getAIProvider').mockImplementation(() => {
        throw new ConfigurationError('Vertex API key is not configured with sensitive key path /etc/secrets/token');
      });

      const formData = new FormData();
      formData.append('question', 'Điều kiện tốt nghiệp là gì?');
      formData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'test.pdf');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('The configured AI provider is unavailable.');
      expect(json.code).toBe('PROVIDER_NOT_CONFIGURED');
      expect(json).not.toHaveProperty('stack');

      // Verify server logs are sanitized
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessages = consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedMessages).toContain('code=PROVIDER_NOT_CONFIGURED');
      expect(loggedMessages).toContain('[HDT_ANALYZE_CONFIG_ERR]');
      expect(loggedMessages).not.toContain('/etc/secrets/token');
    });

    it('should prove sensitive provider errors are absent from BOTH response and server logs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sensitiveUpstreamMsg =
        '403 Forbidden https://provider.example?key=SECRET123KEY\nAuthorization: Bearer SECRET_TOKEN';

      vi.spyOn(providerModule, 'getAIProvider').mockReturnValue({
        id: 'vertex',
        displayName: 'Vertex AI',
        analyzeDocument: vi.fn().mockRejectedValue(
          new AIProviderError(sensitiveUpstreamMsg, { sensitive: 'data' })
        ),
      });

      const formData = new FormData();
      formData.append('question', 'Điều kiện tốt nghiệp là gì?');
      formData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'test.pdf');
      formData.append('model', 'client-attempted-override');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(502);
      const json = await res.json();

      // 1. Assert public response safety
      expect(json.error).toBe('AI provider request failed. Please try again.');
      expect(json.code).toBe('AI_PROVIDER_ERROR');
      const responseString = JSON.stringify(json);
      expect(responseString).not.toContain('SECRET123KEY');
      expect(responseString).not.toContain('SECRET_TOKEN');
      expect(responseString).not.toContain('https://provider.example');
      expect(responseString).not.toContain('403 Forbidden');

      // 2. Assert server log safety
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedError = consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedError).toContain('[HDT_ANALYZE_PROVIDER_ERR]');
      expect(loggedError).toContain('code=AI_PROVIDER_ERROR');
      expect(loggedError).not.toContain('SECRET123KEY');
      expect(loggedError).not.toContain('SECRET_TOKEN');
      expect(loggedError).not.toContain('https://provider.example');
      expect(loggedError).not.toContain('403 Forbidden');
    });

    it('should sanitize generic unexpected errors without leaking raw exception details to client or logs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(providerModule, 'getAIProvider').mockImplementation(() => {
        throw new Error('Database connection failed to postgresql://user:PASS123@db.internal:5432/hdt');
      });

      const formData = new FormData();
      formData.append('question', 'Điều kiện tốt nghiệp là gì?');
      formData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'test.pdf');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('An unexpected error occurred during document analysis.');
      expect(json.code).toBe('INTERNAL_ERROR');

      const responseString = JSON.stringify(json);
      expect(responseString).not.toContain('PASS123');
      expect(responseString).not.toContain('postgresql://');

      const loggedError = consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedError).toContain('[HDT_ANALYZE_ERR]');
      expect(loggedError).toContain('code=INTERNAL_ERROR');
      expect(loggedError).not.toContain('PASS123');
      expect(loggedError).not.toContain('postgresql://');
    });
  });
});
