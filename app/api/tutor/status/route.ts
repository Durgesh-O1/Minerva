import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getClientConfig } from '@/lib/grok';

export async function GET() {
  const config = getClientConfig();
  const rawXaiKey = process.env.XAI_API_KEY?.trim() || '';

  const results: {
    status: 'online' | 'degraded' | 'offline';
    provider: string;
    model: string;
    grokOfficial: {
      configured: boolean;
      validKeyFormat: boolean;
      status: string;
      details: string;
    };
    liveAI: {
      provider: string;
      model: string;
      status: string;
      latencyMs?: number;
    };
  } = {
    status: 'offline',
    provider: config.provider,
    model: config.model,
    grokOfficial: {
      configured: Boolean(rawXaiKey),
      validKeyFormat: rawXaiKey.startsWith('xai-'),
      status: 'untested',
      details: '',
    },
    liveAI: {
      provider: config.provider,
      model: config.model || 'none',
      status: 'untested',
    },
  };

  // 1. Check official Grok key format and connectivity
  if (!rawXaiKey) {
    results.grokOfficial.status = 'not_configured';
    results.grokOfficial.details =
      'XAI_API_KEY is not set in .env.local. Obtain an official key starting with "xai-" from https://console.x.ai/api-keys';
  } else if (!rawXaiKey.startsWith('xai-')) {
    results.grokOfficial.status = 'invalid_format';
    results.grokOfficial.details =
      `The configured key starts with "${rawXaiKey.slice(0, 5)}...". Official xAI Grok API keys must start with "xai-".`;
  } else {
    // Test official xAI key with a 3-second ping
    const startTime = Date.now();
    try {
      const xaiClient = new OpenAI({
        apiKey: rawXaiKey,
        baseURL: 'https://api.x.ai/v1',
        timeout: 4000,
      });
      await xaiClient.models.list();
      results.grokOfficial.status = 'active';
      results.grokOfficial.details = `Connected to xAI official endpoint (${Date.now() - startTime}ms)`;
    } catch (err: any) {
      results.grokOfficial.status = 'error';
      results.grokOfficial.details = `xAI API call failed: ${err.message || err}`;
    }
  }

  // 2. Check active AI engine (OpenRouter Live AI or official Grok)
  if (config.isLive) {
    const startTime = Date.now();
    try {
      const liveClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: 5000,
      });

      const ping = await liveClient.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10,
      });

      if (ping.choices[0]?.message) {
        results.liveAI.status = 'active';
        results.liveAI.latencyMs = Date.now() - startTime;
        results.status = 'online';
      }
    } catch (err: any) {
      results.liveAI.status = 'error';
      results.status = 'degraded';
    }
  } else {
    results.liveAI.status = 'fallback_mode';
    results.status = 'degraded';
  }

  return NextResponse.json(results);
}
