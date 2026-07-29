import { describe, it, expect } from 'vitest';
import {
  isAvailabilityError,
  isHardProviderError,
  isDailyQuotaError,
} from '@/lib/orchestrator/generate';

// Real error strings captured from failed "Hourly Post Generation" runs —
// these are the exact shapes the classifiers must route correctly.
const TPD_429 =
  'LLM API error 429: {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_x` service tier `on_demand` on tokens per day (TPD): Limit 100000, Used 99655, Requested 5818. Please try again in 1h18m48.672s.","type":"tokens","code":"rate_limit_exceeded"}}';
const TPM_429 =
  'LLM API error 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Used 6100, Requested 5500. Please try again in 12.5s.","type":"tokens","code":"rate_limit_exceeded"}}';
const JSON_VALIDATE_400 =
  'LLM API error 400: {"error":{"message":"Failed to generate JSON. Please adjust your prompt. See \'failed_generation\' for more details.","type":"invalid_request_error","code":"json_validate_failed","failed_generation":"{\\n\\"title\\": \\"…"}}';
const DECOMMISSIONED_400 =
  'LLM API error 400: {"error":{"message":"The model `llama3-70b-8192` has been decommissioned.","type":"invalid_request_error","code":"model_decommissioned"}}';

describe('isAvailabilityError (advance the failover chain)', () => {
  it('matches 429 rate limits, 413 over-budget, and 5xx', () => {
    expect(isAvailabilityError(TPD_429)).toBe(true);
    expect(isAvailabilityError(TPM_429)).toBe(true);
    expect(isAvailabilityError('LLM API error 413: request too large')).toBe(true);
    expect(isAvailabilityError('LLM API error 503: service unavailable')).toBe(true);
  });

  it('does not match hard 400s or schema feedback', () => {
    expect(isAvailabilityError(JSON_VALIDATE_400)).toBe(false);
    expect(isAvailabilityError('body — String must contain at least 800 character(s)')).toBe(false);
  });
});

describe('isHardProviderError (advance the chain — same request cannot succeed)', () => {
  it('matches Groq json_validate_failed and decommissioned/unknown models', () => {
    expect(isHardProviderError(JSON_VALIDATE_400)).toBe(true);
    expect(isHardProviderError(DECOMMISSIONED_400)).toBe(true);
    expect(
      isHardProviderError('LLM API error 404: {"error":{"message":"The model `x` does not exist","code":"model_not_found"}}')
    ).toBe(true);
  });

  it('does not match rate limits, auth failures, or content-level misses', () => {
    expect(isHardProviderError(TPD_429)).toBe(false);
    expect(isHardProviderError('LLM API error 401: invalid api key')).toBe(false);
    expect(isHardProviderError('response was not valid JSON')).toBe(false);
  });
});

describe('isDailyQuotaError (fail fast at the end of the chain)', () => {
  it('matches tokens-per-day 429s but not per-minute ones', () => {
    expect(isDailyQuotaError(TPD_429)).toBe(true);
    expect(isDailyQuotaError(TPM_429)).toBe(false);
  });

  it('does not match non-429 errors mentioning days', () => {
    expect(isDailyQuotaError('LLM API error 400: try again per day')).toBe(false);
  });
});
