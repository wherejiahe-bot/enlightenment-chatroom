# 🌸 开悟聊天室 · Enlightenment Chat Room

**通过语音对话，体验三步自觉。**

一个 AI 驱动的灵性引导聊天室。打开网页，你就可以和 AI 导师对话。支持**语音输入**和**语音朗读**（温柔女声），自然地引导你完成霎哈嘉瑜伽的三步自觉法。

## ✨ 功能

- 🎤 **语音输入** — 点击麦克风，直接说话，不用打字
- 🔊 **语音朗读** — AI 的回复会以温柔女声自动朗读
- 🌍 **多语言** — 中/英/粤/日/韩/法/德/西 — 你说的语言，AI 就用什么语言回
- 🧘 **三步自觉引导** — 手放左心 → 前额 → 顶轮，逐步体验内在宁静
- 💬 **打字聊天** — 也支持传统文字输入
- ⚙️ **可配置** — 自由开关语音、选择声音、选择语言

## 🚀 快速开始

### 前置要求

- Node.js 18+
- [DeepSeek API Key](https://platform.deepseek.com/api_keys)

### 安装

```bash
# 克隆项目
git clone https://github.com/wherejiahe-bot/enlightenment-chatroom.git
cd enlightenment-chatroom

# 安装依赖
npm install

# 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
```

### 运行

```bash
npm start
```

打开浏览器访问 `http://localhost:3000`，即可开始对话。

## ☁️ 部署

### 部署到 Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/wherejiahe-bot/enlightenment-chatroom)

1. 点击上方按钮
2. 在 Railway 面板中设置环境变量 `DEEPSEEK_API_KEY`
3. 部署完成即可访问

### 部署到 Render

1. Fork 本项目
2. 在 [Render Dashboard](https://dashboard.render.com) 创建 Web Service
3. 选择你的 fork，Build Command 填 `npm install`，Start Command 填 `npm start`
4. 添加环境变量 `DEEPSEEK_API_KEY`
5. 部署

### 部署到自己的服务器

```bash
# 使用 PM2 保持进程
npm install -g pm2
pm2 start server.js --name enlightenment-chatroom
```

## 🔧 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | **必填** |
| `DEEPSEEK_BASE_URL` | API 地址 | `https://api.deepseek.com` |
| `MODEL_NAME` | 模型名称 | `deepseek-chat` |
| `PORT` | 服务器端口 | `3000` |

## 🧘 三步自觉

AI 会通过自然对话，引导你完成以下三个步骤：

1. **手放左心** — 连接内心的真诚愿望
2. **手放前额** — 完全宽恕自己和他人
3. **手放顶轮** — 感受顶轮之上的清凉

随时可以在聊天中点击 "☸ 开悟聊天室" 标志查看步骤说明。

## 📄 许可证

MIT
