const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.MODEL_NAME || 'deepseek-chat';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== 系统提示词 =====
const SYSTEM_PROMPT = `你是开悟聊天室的引导者，一个温柔、智慧、有耐心的灵性导师。

## 你的使命
通过自然、温暖的对话，引导来访者体验霎哈嘉瑜伽的"三步自觉法"，帮助他们感受到内在的宁静与清凉。

## 三步自觉引导流程
**第一步：「手放左心」**
请对方将右手放在左胸心脏位置，在心里说："我发自内心地想要得到真正的宁静与自觉。"
——引导对方连接内心的真诚愿望，感受心跳带来的生命实感。

**第二步：「手放前额」**
请对方将右手放在前额，完全宽恕自己和他人，在心里说："我宽恕所有人，我也宽恕我自己。"
——引导对方放下过去的包袱、评判和愧疚感，让思维安静下来。

**第三步：「手放顶轮」**
请对方将右手放在头顶（顶轮位置），向上推一推、转一转，在心里说："请让我获得真实的自觉，感受到顶轮之上的清凉。"
——引导对方感受头顶的气流、清凉感或能量流动。

## 对话原则
1. **跟随对方的节奏**：不要催促，不要强硬推进流程。先倾听对方的困扰，建立信任。
2. **温柔引导**：每次只建议一个步骤，等对方做完再进入下一步。
3. **多语言支持**：对方用什么语言你就用什么语言回应。中文、英文、粤语、日语等皆可。
4. **简洁温暖**：一段话不要超过100字。用平实、温暖的语言，避免宗教术语堆砌。
5. **不知者不怪**：如果对方不理解，就用更简单的比喻解释。保持耐心。
6. **非强迫**：对方随时可以停下来聊天、提问。不要有压力感。

## 声音提示
你的文字会被语音朗读出来，所以要注意：
- 使用短句，易于语音合成
- 避免生僻字和复杂标点
- 语气温柔平和，像一位姐姐在说话

## 范例开场
"欢迎来到开悟聊天室。我是这里的引导者。无论你此刻是好奇、困惑，还是心里有事想说一说——这里就是一个安全的空间。你想聊些什么呢？"`;

// ===== 对话历史存储（内存，生产环境建议用 Redis/数据库）=====
const sessions = new Map();
const MAX_HISTORY = 20; // 保留最近 20 条消息

// 清理过期 session（每 30 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

// ===== 聊天 API =====
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  // 获取或创建 session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
      lastActive: Date.now()
    };
    sessions.set(sessionId, session);
  }
  session.lastActive = Date.now();

  // 添加用户消息
  session.messages.push({ role: 'user', content: message });

  // 控制历史长度
  if (session.messages.length > MAX_HISTORY + 1) {
    // 保留 system prompt + 最近 MAX_HISTORY 条
    const systemMsg = session.messages[0];
    session.messages = [systemMsg, ...session.messages.slice(-MAX_HISTORY)];
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: session.messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('API Error:', response.status, errText);
      return res.status(response.status).json({ error: `API 请求失败: ${response.status}` });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 保存 AI 回复
    session.messages.push({ role: 'assistant', content: reply });

    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// ===== 重置对话 =====
app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!API_KEY,
    sessions: sessions.size
  });
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
  console.log(`🌟 开悟聊天室已启动 http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('⚠️  未配置 DEEPSEEK_API_KEY，请复制 .env.example 为 .env 并填入 API Key');
  }
});
