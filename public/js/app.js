(function() {
  'use strict';

  // ===== 状态 =====
  const state = {
    sessionId: generateId(),
    isListening: false,
    isSpeaking: false,
    ttsEnabled: true,
    sttEnabled: true,
    recognition: null,
    selectedVoice: null,
    lang: 'zh-CN',
    isFirstMessage: true
  };

  // ===== DOM 引用 =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const el = {
    messages: $('#messages'),
    input: $('#inputMsg'),
    btnSend: $('#btnSend'),
    btnVoice: $('#btnVoice'),
    voiceStatus: $('#voiceStatus'),
    voiceStatusText: $('#voiceStatusText'),
    settingsBtn: $('#btnSettings'),
    settingsOverlay: $('#settingsOverlay'),
    closeSettings: $('#closeSettings'),
    stepsOverlay: $('#stepsOverlay'),
    closeSteps: $('#closeSteps'),
    toggleTTS: $('#toggleTTS'),
    toggleSTT: $('#toggleSTT'),
    voiceSelect: $('#voiceSelect'),
    langSelect: $('#langSelect'),
    btnReset: $('#btnResetChat'),
    container: $('#chat-container')
  };

  // ===== 工具函数 =====
  function generateId() {
    return 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      el.container.scrollTop = el.container.scrollHeight;
    });
  }

  // ===== 欢迎消息 =====
  function showWelcome() {
    const div = document.createElement('div');
    div.className = 'welcome-msg';
    div.innerHTML = `
      <span class="deco">🌸</span>
      <h2>欢迎来到开悟聊天室</h2>
      <p>
        我是这里的引导者。无论你此刻是好奇、困惑，<br>
        还是心里有事想说一说——这里就是一个安全的空间。
      </p>
      <div class="steps-preview">
        <span class="step-1-highlight">① 手放左心</span>
        <span class="step-2-highlight">② 手放前额</span>
        <span class="step-3-highlight">③ 手放顶轮</span>
      </div>
      <p style="margin-top:12px;font-size:13px;color:var(--text-muted)">
        试试语音输入 🎤 或直接打字
      </p>
    `;
    el.messages.appendChild(div);
    scrollToBottom();
  }

  // ===== 渲染消息 =====
  function addMessage(text, role) {
    // 移除欢迎消息（如果有）
    const welcome = el.messages.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '🧑' : '🌸';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    div.appendChild(role === 'user' ? bubble : avatar);
    div.appendChild(role === 'user' ? avatar : bubble);
    el.messages.appendChild(div);
    scrollToBottom();
    return bubble;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'typing-msg';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '🌸';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    div.appendChild(avatar);
    div.appendChild(bubble);
    el.messages.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const t = document.getElementById('typing-msg');
    if (t) t.remove();
  }

  // ===== TTS - 温柔女声朗读 =====
  function initVoices() {
    const voices = speechSynthesis.getVoices();
    el.voiceSelect.innerHTML = '';

    // 优先找中文温柔女声
    const preferred = [];
    const backup = [];

    for (const v of voices) {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;

      // 优先选择：中文女声
      if (v.lang.startsWith('zh') && v.name.toLowerCase().includes('female')) {
        preferred.push(opt);
      } else if (v.lang.startsWith('zh') && !v.name.toLowerCase().includes('male')) {
        preferred.push(opt);
      } else if (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) {
        backup.push(opt);
      } else {
        backup.push(opt);
      }
    }

    // 微软系列的女声通常很温柔
    const allOpts = [...preferred, ...backup];
    allOpts.forEach(o => el.voiceSelect.appendChild(o));

    // 自动选择第一个中文女声
    if (preferred.length > 0) {
      el.voiceSelect.value = preferred[0].value;
    }

    // 选中状态
    const selectedURI = el.voiceSelect.value;
    state.selectedVoice = voices.find(v => v.voiceURI === selectedURI) || voices[0];
  }

  // 语音合成带回调
  function speak(text, callback) {
    if (!state.ttsEnabled) {
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 温柔女声参数
    if (state.selectedVoice) {
      utterance.voice = state.selectedVoice;
    }
    utterance.rate = 0.9;     // 稍慢
    utterance.pitch = 1.1;    // 稍高 - 更女性化
    utterance.volume = 1;

    state.isSpeaking = true;

    utterance.onend = () => {
      state.isSpeaking = false;
      if (callback) callback();
    };

    utterance.onerror = () => {
      state.isSpeaking = false;
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  }

  // 停止朗读
  function stopSpeaking() {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
  }

  // ===== STT - 语音识别 =====
  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('浏览器不支持语音识别');
      el.btnVoice.style.opacity = '0.3';
      el.btnVoice.title = '浏览器不支持语音输入';
      return;
    }

    state.recognition = new SR();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.lang = state.lang;

    let finalTranscript = '';

    state.recognition.onresult = (event) => {
      let interim = '';
      finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // 实时显示中间结果
      if (interim) {
        el.input.value = finalTranscript + interim;
      } else if (finalTranscript) {
        el.input.value = finalTranscript;
      }
    };

    state.recognition.onend = () => {
      stopListeningUI();
      // 如果有最终结果，自动发送
      if (finalTranscript && finalTranscript.trim()) {
        sendMessage();
      }
    };

    state.recognition.onerror = (event) => {
      stopListeningUI();
      if (event.error === 'no-speech') {
        el.voiceStatusText.textContent = '没有听到声音，再试一次？';
        setTimeout(() => {
          if (!state.isListening) el.voiceStatus.hidden = true;
        }, 1500);
      } else if (event.error === 'audio-capture') {
        el.voiceStatusText.textContent = '麦克风不可用，请检查权限';
      } else {
        el.voiceStatusText.textContent = '语音识别出错：' + event.error;
      }
    };
  }

  function toggleListening() {
    if (!state.recognition) return;
    if (!state.sttEnabled) return;
    if (state.isListening) {
      stopListening();
      return;
    }
    startListening();
  }

  function startListening() {
    if (state.isListening) return;
    try {
      state.recognition.lang = state.lang;
      state.recognition.start();
      state.isListening = true;
      el.btnVoice.classList.add('listening');
      el.voiceStatus.hidden = false;
      el.voiceStatusText.textContent = '正在聆听...';
      el.input.placeholder = '语音输入中...';
    } catch (e) {
      console.warn('语音启动失败:', e);
    }
  }

  function stopListening() {
    if (!state.isListening) return;
    try {
      state.recognition.stop();
    } catch (e) { /* ignore */ }
    stopListeningUI();
  }

  function stopListeningUI() {
    state.isListening = false;
    el.btnVoice.classList.remove('listening');
    el.voiceStatus.hidden = true;
    el.input.placeholder = '说点什么，或点击麦克风语音输入...';
  }

  // ===== 发送消息 =====
  async function sendMessage() {
    const text = el.input.value.trim();
    if (!text) return;
    if (state.isSpeaking) stopSpeaking();

    el.input.value = '';
    el.input.style.height = 'auto';
    addMessage(text, 'user');

    // 记录第一条消息已发
    state.isFirstMessage = false;

    // 显示打字指示
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: state.sessionId })
      });

      removeTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMessage(err.error || '抱歉，我暂时无法回应。请稍后重试。', 'ai');
        return;
      }

      const data = await res.json();
      const reply = data.reply;
      state.sessionId = data.sessionId;

      addMessage(reply, 'ai');

      // 语音朗读回复
      speak(reply);

    } catch (err) {
      removeTyping();
      addMessage('网络出了点问题，请检查连接后重试。', 'ai');
      console.error('Chat error:', err);
    }
  }

  // ===== 重置对话 =====
  async function resetChat() {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId })
      });
    } catch (e) { /* ignore */ }

    state.sessionId = generateId();
    el.messages.innerHTML = '';
    stopSpeaking();
    showWelcome();
  }

  // ===== 自动调整输入框高度 =====
  function autoResize() {
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 120) + 'px';
  }

  // ===== 初始化 =====
  function init() {
    showWelcome();

    // 初始化语音
    if ('speechSynthesis' in window) {
      // Chrome 异步加载 voices
      if (speechSynthesis.getVoices().length) {
        initVoices();
      }
      speechSynthesis.onvoiceschanged = initVoices;
    }

    // 语音识别
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      initSpeechRecognition();
    } else {
      el.btnVoice.style.opacity = '0.3';
      el.btnVoice.title = '浏览器不支持语音输入';
    }

    // === 事件绑定 ===

    // 发送
    el.btnSend.addEventListener('click', sendMessage);
    el.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    el.input.addEventListener('input', autoResize);

    // 语音
    el.btnVoice.addEventListener('click', toggleListening);

    // 设置面板
    el.settingsBtn.addEventListener('click', () => {
      el.settingsOverlay.hidden = false;
      // 刷新语音列表
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        if (voices.length) initVoices();
      }
    });
    el.closeSettings.addEventListener('click', () => {
      el.settingsOverlay.hidden = true;
    });
    el.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === el.settingsOverlay) el.settingsOverlay.hidden = true;
    });

    // 三步自觉浮窗
    el.closeSteps.addEventListener('click', () => {
      el.stepsOverlay.hidden = true;
    });
    el.stepsOverlay.addEventListener('click', (e) => {
      if (e.target === el.stepsOverlay) el.stepsOverlay.hidden = true;
    });

    // TTS 开关
    el.toggleTTS.addEventListener('change', (e) => {
      state.ttsEnabled = e.target.checked;
      if (!state.ttsEnabled) stopSpeaking();
    });

    // STT 开关
    el.toggleSTT.addEventListener('change', (e) => {
      state.sttEnabled = e.target.checked;
      if (!e.target.checked && state.isListening) stopListening();
      el.btnVoice.style.opacity = state.sttEnabled ? '1' : '0.3';
    });

    // 语音选择
    el.voiceSelect.addEventListener('change', (e) => {
      const voices = speechSynthesis.getVoices();
      state.selectedVoice = voices.find(v => v.voiceURI === e.target.value) || voices[0];
      // 试听
      speak('你好，欢迎来到开悟聊天室。');
    });

    // 语言选择
    el.langSelect.addEventListener('change', (e) => {
      state.lang = e.target.value;
      if (state.recognition) {
        state.recognition.lang = state.lang;
      }
    });

    // 重置
    el.btnReset.addEventListener('click', () => {
      if (confirm('确定要重置对话吗？所有聊天记录将消失。')) {
        resetChat();
        el.settingsOverlay.hidden = true;
      }
    });

    // 键盘快捷键：Esc 关闭面板
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        el.settingsOverlay.hidden = true;
        el.stepsOverlay.hidden = true;
        if (state.isListening) stopListening();
      }
    });

    // 点击三步自觉指示 (在 logo 上)
    document.querySelector('.logo')?.addEventListener('click', () => {
      el.stepsOverlay.hidden = !el.stepsOverlay.hidden;
    });

    console.log('🌸 开悟聊天室已加载');
    console.log('📝 Session:', state.sessionId);
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
