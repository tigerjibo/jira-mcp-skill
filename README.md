# JIRA MCP Skill

JIRA 项目管理 Skill，支持任务创建、进度跟踪、BUG 状态查询和看板管理。

## 功能特性

- ✅ **任务管理**: 创建任务、创建子任务、查询任务详情
- ✅ **进度跟踪**: 任务完成进度、按经办人分组统计
- ✅ **BUG 管理**: BUG 状态报告、高优先级 BUG 识别
- ✅ **看板管理**: 获取看板问题、项目看板列表
- ✅ **零依赖**: 无需启动服务器，直接调用 JIRA API

## 快速开始

### 1. 安装

```bash
npm install jira-mcp-skill
```

或直接复制文件到项目：

```bash
cp -r jira-mcp-skill/.trae/skills/jira-mcp .trae/skills/
```

### 2. 配置认证

创建 `.env` 文件：

```env
JIRA_BASE_URL=https://your-jira-url/jira
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx;
```

或使用环境变量：

```bash
export JIRA_BASE_URL=https://your-jira-url/jira
export JIRA_COOKIES="JSESSIONID=xxx; atlassian.xsrf.token=xxx;"
```

### 3. 使用

```javascript
const jira = require('jira-mcp-skill');

// 查询 BUG 状态
const bugStatus = await jira.getBugStatus(2162);
console.log(`BUG 进度: ${bugStatus.progress}%`);

// 查询任务进度
const progress = await jira.getTaskProgress(['ISID-7010', 'ISID-7011']);
console.log(`任务进度: ${progress.progress}%`);

// 创建任务
const result = await jira.createIssue({
  project: { key: 'ISID' },
  summary: '新任务',
  issuetype: { name: '任务' }
});
```

## API 文档

### 核心函数

| 函数 | 说明 | 参数 |
|------|------|------|
| `searchIssues(jql, fields, maxResults)` | JQL 搜索问题 | jql: 查询语句, fields: 字段列表, maxResults: 最大结果数 |
| `getIssue(issueKey)` | 获取单个问题 | issueKey: 问题键 (如 'ISID-1234') |
| `getBoardIssues(boardId, maxResults)` | 获取看板问题 | boardId: 看板ID, maxResults: 最大结果数 |
| `getProjectBoards(projectKey)` | 获取项目看板 | projectKey: 项目键 |
| `getProjects()` | 获取所有项目 | - |
| `createIssue(issueData)` | 创建问题 | issueData: 问题数据对象 |
| `createSubtask(parentKey, summary, options)` | 创建子任务 | parentKey: 父任务键, summary: 标题, options: 选项 |

### 便捷函数

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `getTaskProgress(taskKeys)` | 任务进度统计 | `{ total, completed, progress, issues }` |
| `getBugStatus(boardId)` | BUG 状态报告 | `{ total, completed, progress, statusDistribution, highPriority }` |
| `getOpenTasksByAssignee(taskKeys)` | 按经办人分组未完成任务 | `{ total, openCount, byAssignee }` |

## 使用示例

### 1. BUG 状态报告

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

### 2. 任务进度跟踪

```javascript
const jira = require('jira-mcp-skill');

async function trackProgress() {
  const taskKeys = ['ISID-7010', 'ISID-7011', 'ISID-7012'];
  const progress = await jira.getTaskProgress(taskKeys);
  
  console.log(`进度: ${progress.completed}/${progress.total} (${progress.progress}%)`);
  
  progress.issues.forEach(i => {
    const status = i.status || 'Unknown';
    const assignee = i.assignee || '未分配';
    console.log(`  ${i.key} [${status}] ${i.summary} - ${assignee}`);
  });
}
```

### 3. 创建任务（含自定义字段）

```javascript
const jira = require('jira-mcp-skill');

async function createDevTask() {
  const result = await jira.createIssue({
    project: { key: 'ISID' },
    summary: '【开发】新功能开发',
    issuetype: { name: '任务' },
    assignee: { name: 'username' },
    reporter: { name: 'reporter' },
    customfield_10315: { value: '开发' },
    customfield_11443: { value: '维护（SP）' },
    customfield_10302: '2026-03-20',
    customfield_10303: '2026-03-25',
    customfield_10105: '5d'
  });
  
  console.log(`创建成功: ${result.key}`);
}
```

### 4. 创建子任务

```javascript
const jira = require('jira-mcp-skill');

async function createSub() {
  const result = await jira.createSubtask('ISID-6874', '子任务标题', {
    projectKey: 'ISID',
    customFields: {
      assignee: { name: 'username' },
      customfield_10315: { value: '开发' }
    }
  });
  
  console.log(`子任务创建成功: ${result.key}`);
}
```

## 自定义字段参考

| 字段名 | Field ID | 说明 |
|--------|----------|------|
| 任务类型 | customfield_10315 | 开发/测试/设计等 |
| 项目类型 | customfield_11443 | 维护(SP)/功能等 |
| Product | customfield_10317 | 产品标识 |
| 分类 | customfield_11523 | 分类信息 |
| 计划开始时间 | customfield_10302 | 日期格式 |
| 计划结束时间 | customfield_10303 | 日期格式 |
| 修复的版本 | customfield_10329 | 版本字符串 |
| 初始预估 | customfield_10105 | 工时估算 (如: 5d) |

## 认证方式

### 方式 1: Cookies（推荐用于 SSO 环境）

1. 登录 JIRA
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面，点击任意 `/rest/api/` 请求
5. 复制 Request Headers 中的 Cookie 值

```env
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx;
```

### 方式 2: Bearer Token

1. 登录 JIRA
2. 在开发者工具中找到包含 Authorization 的请求
3. 复制完整的 Bearer Token

```env
JIRA_AUTH_TOKEN=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 错误处理

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| 401 | Cookie 过期 | 重新获取认证信息 |
| 302 | SSO 重定向 | 检查 Cookie 格式 |
| 404 | 问题/看板不存在 | 验证 ID 是否正确 |

## 文件结构

```
jira-mcp-skill/
├── package.json       # npm 包配置
├── README.md          # 使用说明
├── .env.example       # 环境变量示例
├── jira-client.js     # 核心 API 客户端
├── test.js            # 测试脚本
└── .trae/
    └── skills/
        └── jira-mcp/
            └── SKILL.md   # Trae AI Skill 定义
```

## 在 Trae AI 中使用

将 `jira-mcp` 目录复制到项目的 `.trae/skills/` 目录下：

```bash
mkdir -p .trae/skills
cp -r jira-mcp-skill/.trae/skills/jira-mcp .trae/skills/
```

然后在 Trae AI 中可以直接使用：

```
帮我查询 F03SP04 项目的 BUG 状态
帮我创建一个开发任务
```

## 系统要求

- Node.js >= 14.0.0
- axios >= 1.6.0
- 有效的 JIRA 认证凭据

## 许可证

MIT

## 更新日志

### v1.0.0
- 初始版本
- 支持任务创建、查询、进度跟踪
- 支持 BUG 状态报告
- 支持看板管理
- 零依赖直接 API 调用
