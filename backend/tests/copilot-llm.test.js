'use strict';

/**
 * Exercises the LLM polish layer of the copilot with mocked provider
 * responses (Gemini + OpenAI), including failure fallbacks.
 */

process.env.NODE_ENV = 'test';
process.env.FORCE_MEMORY_DB = 'true';
process.env.FORCE_MEMORY_CACHE = 'true';

const { setup, loginAs } = require('./helpers');

describe('Copilot LLM polish layer', () => {
  let app;
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
  });

  beforeAll(async () => { app = await setup(); });

  async function copilotWithEnv(envPatch, fetchMock) {
    Object.assign(process.env, envPatch);
    global.fetch = fetchMock;
    // Re-require config so the service reads the new keys.
    jest.resetModules();
    const analyst = await loginAs('analyst@urbanflow.ai');
    const request = require('supertest');
    return request(app).post('/api/v1/copilot/chat')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ message: 'Show connectivity gaps' });
  }

  test('uses Gemini polish when GEMINI_API_KEY is set', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Polished Gemini answer about connectivity gaps in Chennai wards.' }] } }] }),
    }));
    // config caches keys at require time — set env before first require in this module state
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    jest.resetModules();
    const copilotService = require('../src/services/copilotService');
    global.fetch = fetchMock;

    const analyst = await loginAs('analyst@urbanflow.ai');
    const result = await copilotService.chat({ message: 'Show connectivity gaps', user: analyst.user });
    expect(result.answer).toContain('Polished Gemini');
    expect(fetchMock).toHaveBeenCalled();
  });

  test('falls back to deterministic answer when Gemini returns empty text', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    jest.resetModules();
    const copilotService = require('../src/services/copilotService');
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }) }));

    const analyst = await loginAs('analyst@urbanflow.ai');
    const result = await copilotService.chat({ message: 'Show connectivity gaps', user: analyst.user });
    expect(result.answer.length).toBeGreaterThan(30);
    expect(result.answer).toContain('zones with connectivity gaps');
  });

  test('uses OpenAI polish when only OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    jest.resetModules();
    const copilotService = require('../src/services/copilotService');
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'OpenAI polished demand commentary for planners.' } }] }),
    }));

    const analyst = await loginAs('analyst@urbanflow.ai');
    const result = await copilotService.chat({ message: "Predict next month's demand", user: analyst.user });
    expect(result.answer).toContain('OpenAI polished');
  });

  test('network failure falls back to grounded composer', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    jest.resetModules();
    const copilotService = require('../src/services/copilotService');
    global.fetch = jest.fn(async () => { throw new Error('network down'); });

    const analyst = await loginAs('analyst@urbanflow.ai');
    const result = await copilotService.chat({ message: 'Congestion hotspots please', user: analyst.user });
    expect(result.answer).toContain('Congestion hotspots');
  });
});
