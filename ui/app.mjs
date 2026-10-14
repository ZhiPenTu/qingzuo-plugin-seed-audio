import { createPluginClient } from './sdk.mjs';
import { buildAudioPayload, generateAudio } from './seed_audio.mjs';

const client = createPluginClient();
const bridge = globalThis.commercePlugin;
const $ = id => document.getElementById(id);

let currentAudioToken = null;
let currentAudioUrl = null;
let busy = false;

function message(text, type = '') {
  const el = $('status');
  el.textContent = text;
  el.className = type;
}

function updateControls() {
  $('key').disabled = busy;
  $('save-key').disabled = busy;
  $('clear-key').disabled = busy;
  $('prompt').disabled = busy;
  $('format').disabled = busy;
  $('sample-rate').disabled = busy;
  $('speech-rate').disabled = busy;
  $('pitch-rate').disabled = busy;
  $('run').disabled = busy || !$('prompt').value.trim();
  $('cancel').disabled = !busy;
  $('save-audio').disabled = busy || (!currentAudioToken && !currentAudioUrl);
}

async function refreshKeyStatus() {
  try {
    const hasKey = await client.credentials.status('volcengine-ark-key');
    $('key-status').textContent = hasKey
      ? '已配置 API 密钥。音频调用费用由您的账户额度扣除。'
      : '尚未配置 API 密钥，请先输入密钥并保存。';
  } catch (e) {
    $('key-status').textContent = '检查密钥状态失败：' + e.message;
  }
}

$('save-key').onclick = async () => {
  const val = $('key').value.trim();
  if (!val) {
    message('请输入有效的 API 密钥。', 'error');
    return;
  }
  try {
    await client.credentials.set('volcengine-ark-key', val);
    $('key').value = '';
    message('API 密钥已安全保存至系统凭据库。', 'success');
    await refreshKeyStatus();
  } catch (e) {
    message(e.message, 'error');
  }
};

$('clear-key').onclick = async () => {
  try {
    await client.credentials.clear('volcengine-ark-key');
    message('已清除保存的 API 密钥。', 'success');
    await refreshKeyStatus();
  } catch (e) {
    message(e.message, 'error');
  }
};

$('prompt').oninput = updateControls;

$('run').onclick = async () => {
  const prompt = $('prompt').value.trim();
  if (!prompt) {
    message('请输入音频创作描述或台词。', 'error');
    return;
  }

  busy = true;
  updateControls();
  message('正在调用 Seed Audio 1.0 模型创作音频…');

  $('audio-result').hidden = true;
  $('audio-result').pause();
  $('audio-result').removeAttribute('src');
  $('preview-placeholder').hidden = false;
  $('preview-placeholder').textContent = '正在合成与生成音频，请稍候…';

  try {
    const format = $('format').value || 'mp3';
    const payload = buildAudioPayload({
      prompt,
      format,
      sampleRate: $('sample-rate').value,
      speechRate: $('speech-rate').value,
      pitchRate: $('pitch-rate').value
    });

    const result = await generateAudio(client, payload);
    const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg';

    if (result.audioBase64) {
      if (currentAudioToken) await client.files.release(currentAudioToken.token).catch(() => {});
      currentAudioToken = await client.files.create({
        data: result.audioBase64,
        filename: `seed-audio-${Date.now()}.${format}`,
        mime
      });
      const audioSrc = await client.files.url(currentAudioToken.token);
      $('audio-result').src = audioSrc;
      $('audio-result').hidden = false;
      $('preview-placeholder').hidden = true;
      currentAudioUrl = null;
    } else if (result.audioUrl) {
      $('audio-result').src = result.audioUrl;
      $('audio-result').hidden = false;
      $('preview-placeholder').hidden = true;
      currentAudioUrl = result.audioUrl;
    }

    message('音频创作完成！可以在线试听或保存文件。', 'success');
  } catch (error) {
    message(error.message, 'error');
    $('preview-placeholder').textContent = '创作未完成，请检查配置后重试。';
  } finally {
    busy = false;
    updateControls();
  }
};

$('cancel').onclick = async () => {
  message('正在取消操作…');
  try {
    if (bridge?.invoke) {
      await bridge.invoke('tasks.cancel', { id: 'seed-audio-generate' });
    }
    message('已取消生成。');
  } catch (e) {
    message(e.message, 'error');
  } finally {
    busy = false;
    updateControls();
  }
};

$('save-audio').onclick = async () => {
  try {
    const ext = $('format').value || 'mp3';
    if (currentAudioToken) {
      await client.files.save(currentAudioToken.token, currentAudioToken.name || `seed-audio-${Date.now()}.${ext}`);
      message('音频保存成功！', 'success');
    } else if (currentAudioUrl) {
      const response = await client.network.request({
        url: currentAudioUrl,
        method: 'GET',
        responseType: 'file',
        filename: `seed-audio-${Date.now()}.${ext}`
      });
      if (response.file) {
        await client.files.save(response.file.token, response.file.name);
        await client.files.release(response.file.token).catch(() => {});
        message('音频保存成功！', 'success');
      }
    }
  } catch (e) {
    message(e.message, 'error');
  }
};

client.onDispose(() => {
  $('audio-result').pause();
  $('audio-result').removeAttribute('src');
});

refreshKeyStatus();
updateControls();
