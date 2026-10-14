import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAudioPayload, generateAudio } from '../ui/seed_audio.mjs';

test('buildAudioPayload validates prompt and configures audio parameters', () => {
  assert.throws(() => buildAudioPayload({ prompt: '' }), /描述|台词/);
  assert.throws(() => buildAudioPayload({ prompt: '   ' }), /描述|台词/);

  const payload = buildAudioPayload({
    prompt: '早安，祝您今天心情愉快。',
    format: 'mp3',
    sampleRate: 48000,
    speechRate: 20,
    pitchRate: -10
  });
  assert.equal(payload.model, 'seed-audio-1.0');
  assert.equal(payload.text_prompt, '早安，祝您今天心情愉快。');
  assert.equal(payload.audio_config.format, 'mp3');
  assert.equal(payload.audio_config.sample_rate, 48000);
  assert.equal(payload.audio_config.speech_rate, 20);
  assert.equal(payload.audio_config.pitch_rate, -10);
});

test('generateAudio calls audio synthesis endpoint and handles errors and audio outputs', async () => {
  const payload = { model: 'seed-audio-1.0', text_prompt: '测试' };

  // Success with audio base64
  const clientB64 = {
    network: {
      request: async (options) => {
        assert.equal(options.url, 'https://openspeech.bytedance.com/api/v3/tts/create');
        assert.equal(options.method, 'POST');
        assert.equal(options.credential, 'volcengine-ark-key');
        assert.equal(options.credentialHeader, 'Authorization');
        return {
          status: 200,
          data: {
            data: { audio: 'BASE64AUDIO' }
          }
        };
      }
    }
  };
  const resultB64 = await generateAudio(clientB64, payload);
  assert.equal(resultB64.audioBase64, 'BASE64AUDIO');

  // Success with audio URL
  const clientUrl = {
    network: {
      request: async () => ({
        status: 200,
        data: { data: { url: 'https://example.com/audio.mp3' } }
      })
    }
  };
  const resultUrl = await generateAudio(clientUrl, payload);
  assert.equal(resultUrl.audioUrl, 'https://example.com/audio.mp3');

  // 401 error
  const client401 = { network: { request: async () => ({ status: 401 }) } };
  await assert.rejects(generateAudio(client401, payload), /API 密钥无效/);

  // 402 error
  const client402 = { network: { request: async () => ({ status: 402 }) } };
  await assert.rejects(generateAudio(client402, payload), /账户额度不足/);

  // 429 error
  const client429 = { network: { request: async () => ({ status: 429 }) } };
  await assert.rejects(generateAudio(client429, payload), /过于频繁/);

  // Empty data
  const clientEmpty = { network: { request: async () => ({ status: 200, data: {} }) } };
  await assert.rejects(generateAudio(clientEmpty, payload), /未返回有效的音频数据/);
});
