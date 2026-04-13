# JIRA MCP Skill

<div align="center">

[![npm version](https://img.shields.io/npm/v/jira-mcp-skill.svg)](https://www.npmjs.com/package/jira-mcp-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/jira-mcp-skill.svg)](https://nodejs.org)

**JIRA 项目管理 Skill - 支持任务创建、进度跟踪、BUG 状态查询和看板管理**

[English](#english) | [中文](#中文)

</div>

---

## 中文

### 📖 项目简介

JIRA MCP Skill 是一个轻量级的 JIRA 项目管理工具包，专为 Trae AI 和其他 AI 智能体设计。它提供了完整的 JIRA API 封装，支持任务管理、进度跟踪、BUG 状态报告等功能，无需启动额外的服务器进程。

### ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🔧 **任务管理** | 创建任务、创建子任务、查询任务详情 |
| 📊 **进度跟踪** | 任务完成进度统计、按经办人分组统计 |
| 🐛 **BUG 管理** | BUG 状态报告、高优先级 BUG 识别与预警 |
| 📋 **看板管理** | 获取看板问题列表、项目看板查询 |
| ⚡ **零依赖部署** | 无需启动服务器，直接调用 JIRA REST API |
| 🔐 **安全认证** | 支持 Cookie、Bearer Token、API Token 三种认证方式 |
| 🛡️ **Cookie 验证** | 自动检测 Cookie 有效性，识别登出状态和缺失字段 |
| 🔄 **自动配置** | 自动搜索加载 .env 文件，无需手动配置路径 |

### 🚀 快速开始

#### 安装

```bash
# npm 安装
npm install jira-mcp-skill

# 或从 GitHub 安装
npm install git+https://github.com/tigerjibo/jira-mcp-skill.git

# 或直接复制文件
git clone https://github.com/tigerjibo/jira-mcp-skill.git
```

#### 配置认证

创建 `.env` 文件或设置环境变量：

```env
# JIRA 服务器地址
JIRA_BASE_URL=https://your-jira-url/jira

# 认证方式 1: Cookies（推荐用于 SSO 环境）
# 必需字段: JSESSIONID, atlassian.xsrf.token (以 _lin 结尾), seraph.rememberme.cookie
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx_lin; seraph.rememberme.cookie=xxx

# 认证方式 2: Bearer Token
# JIRA_AUTH_TOKEN=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 认证方式 3: API Token（Jira Cloud）
# JIRA_EMAIL=your-email@example.com
# JIRA_API_TOKEN=your-api-token
```

#### 获取认证信息

**Cookies 方式（推荐）**：
1. 登录 JIRA（**勾选"记住我"**）
2. 按 `F12` 打开开发者工具
3. 切换到 `Application` → `Cookies` → 选择 JIRA 域名
4. 复制以下 Cookie 字段（`key=value` 格式，用 `;` 分隔）：

| Cookie 名称 | 必需 | 说明 |
|-------------|------|------|
| `JSESSIONID` | ✅ | 会话 ID |
| `atlassian.xsrf.token` | ✅ | 必须以 `_lin` 结尾（`_lout` 表示已登出） |
| `seraph.rememberme.cookie` | ✅ | 仅在勾选"记住我"后存在 |
| `ngx_jira` | 推荐 | 负载均衡路由 |

**Bearer Token 方式**：
1. 登录 JIRA
2. 在开发者工具中找到包含 `Authorization` 的请求
3. 复制完整的 Bearer Token

### 📚 API 文档

#### 核心函数

```javascript
const jira = require('jira-mcp-skill');

// 验证认证状态
const auth = await jira.checkAuth();
console.log(auth.valid ? `已登录: ${auth.user}` : `认证失败: ${auth.error}`);

// 验证 Cookie 格式
const cookieStatus = jira.validateCookieFormat(process.env.JIRA_COOKIES);
if (!cookieStatus.valid) console.log('Cookie 问题:', cookieStatus.issues);

// JQL 搜索问题
const issues = await jira.searchIssues('project = ISID AND status != DONE');

// 获取单个问题
const issue = await jira.getIssue('ISID-1234');

// 获取看板问题
const boardIssues = await jira.getBoardIssues(2162, 200);

// 获取项目看板列表
const boards = await jira.getProjectBoards('ISID');

// 获取所有项目
const projects = await jira.getProjects();

// 创建问题
const result = await jira.createIssue({
  project: { key: 'ISID' },
  summary: '新任务标题',
  issuetype: { name: '任务' }
});

// 创建子任务
const subtask = await jira.createSubtask('ISID-1234', '子任务标题', {
  projectKey: 'ISID'
});
```

#### 便捷函数

```javascript
// 任务进度统计
const progress = await jira.getTaskProgress(['ISID-7010', 'ISID-7011']);
// 返回: { total, completed, progress, issues }

// BUG 状态报告
const bugStatus = await jira.getBugStatus(2162);
// 返回: { total, completed, progress, statusDistribution, highPriority }

// 按经办人分组未完成任务
const openTasks = await jira.getOpenTasksByAssignee(['ISID-7010', 'ISID-7011']);
// 返回: { total, openCount, byAssignee }
```

### 💡 使用示例

#### BUG 状态报告

```javascript
const jira = require('jira-mcp-skill');

async function reportBugs() {
  const status = await jira.getBugStatus(2162);
  
  console.log('=== BUG 状态报告 ===');
  console.log(`总数: ${status.total}`);
  console.log(`已完成: ${status.completed} (${status.progress}%)`);
  console.log('状态分布:', status.statusDistribution);
  
  if (status.highPriority.length > 0) {
    console.log('\n⚠️ 高优先级未关闭 BUG:');
    status.highPriority.forEach(b => {
      console.log(`  ${b.key} [${b.priority}] ${b.summary}`);
    });
  }
}
```

#### 创建开发任务

```javascript
const jira = require('jira-mcp-skill');

async function createDevTask() {
  const result = await jira.createIssue({
    project: { key: 'ISID' },
    summary: '【开发】新功能开发',
    issuetype: { name: '任务' },
    assignee: { name: 'username' },
    customfield_10315: { value: '开发' },      // 任务类型
    customfield_11443: { value: '维护（SP）' }, // 项目类型
    customfield_10302: '2026-03-20',           // 计划开始时间
    customfield_10303: '2026-03-25',           // 计划结束时间
    customfield_10105: '5d'                    // 初始预估
  });
  
  console.log(`创建成功: ${result.key}`);
}
```

### 🤖 在 Trae AI 中使用

将 Skill 复制到项目目录：

```bash
mkdir -p .trae/skills
cp -r node_modules/jira-mcp-skill/.trae/skills/jira-mcp .trae/skills/
```

然后在 Trae AI 中可以直接对话使用：

```
帮我查询 F03SP04 项目的 BUG 状态
帮我创建一个开发任务
查询 ISID-7010 的任务进度
```

### 📁 项目结构

```
jira-mcp-skill/
├── package.json           # npm 包配置
├── README.md              # 项目说明文档
├── AI-README.md           # AI 智能体专用文档
├── .env.example           # 环境变量配置示例
├── .gitignore             # Git 忽略配置
├── jira-client.js         # 核心 API 客户端
├── test.js                # 测试脚本
└── .trae/
    └── skills/
        └── jira-mcp/
            └── SKILL.md   # Trae AI Skill 定义
```

### ⚙️ 系统要求

- Node.js >= 14.0.0
- axios >= 1.6.0
- 有效的 JIRA 认证凭据

### 🔒 安全说明

- ✅ 所有敏感信息（URL、Token、Cookie）均从环境变量读取
- ✅ 代码中无硬编码凭据
- ✅ `.env` 文件已添加到 `.gitignore`
- ⚠️ 请勿将 `.env` 文件提交到版本控制

### 📄 许可证

[MIT License](LICENSE)

---

## English

### 📖 Introduction

JIRA MCP Skill is a lightweight JIRA project management toolkit designed for Trae AI and other AI agents. It provides complete JIRA API wrapper supporting task management, progress tracking, bug status reporting, and more - without requiring any server process.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🔧 **Task Management** | Create tasks, create subtasks, query task details |
| 📊 **Progress Tracking** | Task completion statistics, group by assignee |
| 🐛 **Bug Management** | Bug status reports, high-priority bug identification |
| 📋 **Board Management** | Get board issues, query project boards |
| ⚡ **Zero Dependencies** | Direct JIRA REST API calls, no server needed |
| 🔐 **Secure Auth** | Support Cookie, Bearer Token, API Token authentication |

### 🚀 Quick Start

#### Installation

```bash
# npm
npm install jira-mcp-skill

# or from GitHub
npm install git+https://github.com/tigerjibo/jira-mcp-skill.git
```

#### Configuration

Create `.env` file:

```env
JIRA_BASE_URL=https://your-jira-url/jira
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx;
```

#### Usage

```javascript
const jira = require('jira-mcp-skill');

// Bug status report
const status = await jira.getBugStatus(2162);
console.log(`Progress: ${status.progress}%`);

// Task progress
const progress = await jira.getTaskProgress(['ISID-7010', 'ISID-7011']);

// Create task
await jira.createIssue({
  project: { key: 'ISID' },
  summary: 'New Task',
  issuetype: { name: 'Task' }
});
```

### 📄 License

[MIT License](LICENSE)
