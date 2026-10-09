import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET as healthHandler } from '../src/app/api/health/route';
import { POST as analyzeHandler } from '../src/app/api/analyze/route';
import * as providerModule from '../src/lib/ai/provider';
import { AIProviderError, ConfigurationError } from '../src/lib/ai/errors';

describe('API Route Hardening & Error Handling', () => {
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
    it('should return honest provider status distinguishing implemented vs configured', async () => {
      delete process.env.VERTEX_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await healthHandler();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('healthy');
      expect(json.prototype.providers.vertex.adapterImplemented).toBe(true);
      expect(json.prototype.providers.vertex.configured).toBe(false);
      expect(json.prototype.providers.vertex.liveTested).toBe(false);

      expect(json.prototype.providers.anthropic.adapterImplemented).toBe(true);
      expect(json.prototype.providers.anthropic.configured).toBe(false);
      expect(json.prototype.providers.anthropic.liveTested).toBe(false);
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

    it('should return safe 503 response when AI provider is not configured', async () => {
      vi.spyOn(providerModule, 'getAIProvider').mockImplementation(() => {
        throw new ConfigurationError('Vertex API key is not configured.');
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
    });

    it('should return safe 502 response when AI provider upstream call fails without leaking secrets', async () => {
      vi.spyOn(providerModule, 'getAIProvider').mockReturnValue({
        id: 'vertex',
        displayName: 'Vertex AI',
        analyzeDocument: vi.fn().mockRejectedValue(
          new AIProviderError('Vertex AI generation request failed: 403 Forbidden with key SECRET123KEY')
        ),
      });

      const formData = new FormData();
      formData.append('question', 'Điều kiện tốt nghiệp là gì?');
      formData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'test.pdf');
      // Pass client model override to test that server ignores it
      formData.append('model', 'untrusted-client-model-override');

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const res = await analyzeHandler(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toBe('AI provider request failed. Please try again.');
      expect(json.code).toBe('AI_PROVIDER_ERROR');
      // Ensure sensitive upstream string is NOT exposed to public client
      expect(JSON.stringify(json)).not.toContain('SECRET123KEY');
      expect(JSON.stringify(json)).not.toContain('403 Forbidden');
    });
  });
});
