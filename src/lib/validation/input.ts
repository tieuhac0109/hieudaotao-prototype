import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for Vercel/Node environment
export const ALLOWED_MIME_TYPES = ['application/pdf'] as const;

export const QuestionSchema = z
  .string()
  .trim()
  .min(3, 'Question must be at least 3 characters long.')
  .max(2000, 'Question must not exceed 2000 characters.');

export const RawEvidenceItemSchema = z.object({
  page: z.number().int().positive('Page number must be a positive integer.'),
  section: z.string().trim().optional(),
  quotedText: z.string().trim().min(1, 'Quoted text must not be empty.'),
  rationale: z.string().trim().optional(),
});

export const ModelOutputSchema = z.object({
  answer: z.string().trim().min(1, 'Answer must not be empty.'),
  answerability: z.enum(['supported', 'partial', 'not_supported']),
  evidence: z.array(RawEvidenceItemSchema).default([]),
  warnings: z.array(z.string().trim()).optional(),
});

export type RawEvidenceItemInput = z.infer<typeof RawEvidenceItemSchema>;
export type ModelOutputParsed = z.infer<typeof ModelOutputSchema>;

/**
 * Validates raw model JSON string or object against ModelOutputSchema.
 * Handles markdown code block stripping and provides clean error reporting.
 */
export function parseAndValidateModelOutput(rawText: string): ModelOutputParsed {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Model returned an empty response.');
  }

  // Remove markdown code fences if model wrapped JSON in ```json ... ```
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Sometimes models include text before or after the JSON block, extract the outermost JSON object:
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown JSON syntax error';
    throw new Error(`Failed to parse AI output as JSON: ${errorMsg}`);
  }

  const result = ModelOutputSchema.safeParse(parsedJson);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`AI output did not match expected structure: ${issues}`);
  }

  return result.data;
}
