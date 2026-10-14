export function buildAudioPayload({ prompt, format = 'mp3', sampleRate = 48000, speechRate = 0, pitchRate = 0 }) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('请输入音频创作描述或台词。');
  }
  return {
    model: 'seed-audio-1.0',
    text_prompt: prompt.trim(),
    audio_config: {
      format: format || 'mp3',
      sample_rate: Number(sampleRate) || 48000,
      speech_rate: Number(speechRate) || 0,
      pitch_rate: Number(pitchRate) || 0,
      loudness_rate: 0
    }
  };
}

export async function generateAudio(client, payload) {
  const response = await client.network.request({
    url: 'https://openspeech.bytedance.com/api/v3/tts/create',
    method: 'POST',
    credential: 'volcengine-ark-key',
    credentialHeader: 'Authorization',
    json: payload,
    taskId: 'seed-audio-generate'
  });
  if (response.status === 401 || response.status === 403) throw new Error('API 密钥无效或未授权。');
  if (response.status === 402) throw new Error('账户额度不足或未开通服务。');
  if (response.status === 429) throw new Error('服务请求过于频繁，请稍后手动重试。');
  if (response.status < 200 || response.status >= 300) throw new Error(`音频创作失败（${response.status}）。`);
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  const audioBase64 = data?.data?.audio || data?.audio || data?.b64_json || null;
  const audioUrl = data?.data?.url || data?.audio_url || data?.url || null;
  if (!audioBase64 && !audioUrl) {
    throw new Error('服务端未返回有效的音频数据。');
  }
  return { audioBase64, audioUrl };
}
