# AI-README.md

> 本文档专为 AI 智能体设计，提供结构化的 API 参考和使用指南。

## 项目元数据

```yaml
name: jira-mcp-skill
version: 1.0.0
type: npm-package
purpose: JIRA project management
author: tigerjibo
license: MIT
repository: https://github.com/tigerjibo/jira-mcp-skill
```

## 环境要求

```yaml
runtime: Node.js >= 14.0.0
dependencies:
  - axios >= 1.6.0
env_vars:
  required:
    - JIRA_BASE_URL: string  # JIRA server URL
  auth_one_of:
    - JIRA_COOKIES: string     # Cookie string for SSO
    - JIRA_AUTH_TOKEN: string  # Bearer token
```

## API 参考

### 认证函数

#### checkAuth()

验证当前认证状态，调用 JIRA `/rest/api/2/myself` 接口。

```yaml
params: none
returns:
  valid: boolean
  user: string | null  # displayName
  username: string | null  # account name
  error: string | null
  hint: string  # Troubleshooting hint when auth fails
```

#### getAuthStatus()

获取当前认证配置状态（不发起 API 请求）。

```yaml
params: none
returns:
  configured: boolean
  authMethod: "Cookies" | "Bearer Token" | "None"
  baseUrl: string
  cookieValidation: { valid: boolean, issues: string[] } | null
```

#### validateCookieFormat(cookies)

验证 Cookie 字符串格式和完整性。

```yaml
params:
  cookies:
    type: string
    required: true
returns:
  valid: boolean
  issues: string[]  # e.g., ["缺少 JSESSIONID", "atlassian.xsrf.token 以 _lout 结尾"]
```

#### ensureAuthenticated()

在 API 调用前预检查认证配置，Cookie 问题时输出警告。

```yaml
params: none
returns: void (throws Error if not configured)
```

### 核心函数

#### searchIssues(jql, fields, maxResults)

搜索 JIRA 问题。

```yaml
params:
  jql:
    type: string
    required: true
    example: "project = ISID AND status != DONE"
  fields:
    type: string
    default: "key,summary,status,assignee,priority"
  maxResults:
    type: number
    default: 50
returns: Array<Issue>
```

#### getIssue(issueKey)

获取单个问题详情。

```yaml
params:
  issueKey:
    type: string
    required: true
    example: "ISID-1234"
returns: Issue
```

#### getBoardIssues(boardId, maxResults)

获取看板上的所有问题。

```yaml
params:
  boardId:
    type: number
    required: true
    example: 2162
  maxResults:
    type: number
    default: 200
returns: Array<Issue>
```

#### getProjectBoards(projectKey)

获取项目的所有看板。

```yaml
params:
  projectKey:
    type: string
    required: true
    example: "ISID"
returns: Array<Board>
```

#### getProjects()

获取所有可访问的项目。

```yaml
params: none
returns: Array<Project>
```

#### createIssue(issueData)

创建新问题/任务。

```yaml
params:
  issueData:
    type: object
    required: true
    properties:
      project:
        type: object
        properties:
          key: string  # Project key
      summary:
        type: string  # Issue title
      issuetype:
        type: object
        properties:
          name: string  # "Task", "Bug", "Sub-task", etc.
      assignee:
        type: object
        properties:
          name: string  # Username
      customfield_*:
        type: any  # Custom fields
returns: { id: string, key: string, self: string }
```

#### createSubtask(parentKey, summary, options)

创建子任务。

```yaml
params:
  parentKey:
    type: string
    required: true
    example: "ISID-1234"
  summary:
    type: string
    required: true
  options:
    type: object
    properties:
      projectKey: string
      issuetype: string
      customFields: object
returns: { id: string, key: string }
```

### 便捷函数

#### getTaskProgress(taskKeys)

计算任务完成进度。

```yaml
params:
  taskKeys:
    type: Array<string>
    required: true
    example: ["ISID-7010", "ISID-7011"]
returns:
  total: number
  completed: number
  progress: number  # Percentage 0-100
  issues: Array<{ key, summary, status, assignee }>
```

#### getBugStatus(boardId)

生成 BUG 状态报告。

```yaml
params:
  boardId:
    type: number
    required: true
returns:
  total: number
  completed: number
  progress: number
  statusDistribution: object  # { "RESOLVED": 10, "NEW": 5, ... }
  openBugs: Array<{ key, summary, status, priority, assignee }>
  highPriority: Array<{ key, summary, priority }>
```

#### getOpenTasksByAssignee(taskKeys)

按经办人分组未完成任务。

```yaml
params:
  taskKeys:
    type: Array<string>
    required: true
returns:
  total: number
  openCount: number
  byAssignee: object  # { "John": [{ key, summary, status }], ... }
```

## 自定义字段映射

```yaml
custom_fields:
  task_type:
    id: customfield_10315
    values: ["开发", "测试", "设计"]
  project_type:
    id: customfield_11443
    values: ["维护（SP）", "功能"]
  product:
    id: customfield_10317
  category:
    id: customfield_11523
  start_date:
    id: customfield_10302
    format: "YYYY-MM-DD"
  end_date:
    id: customfield_10303
    format: "YYYY-MM-DD"
  fix_version:
    id: customfield_10329
  estimate:
    id: customfield_10105
    format: "Xd"  # e.g., "5d" for 5 days
```

## 状态映射

```yaml
done_status:
  - "DONE"
  - "已完成"
  - "Resolved"
  - "Closed"
  - "RESOLVED"
  - "VERIFIED"

high_priority:
  - "Highest"
  - "High"
  - "Critical"
  - "Blocker"
```

## 错误处理

```yaml
errors:
  - code: 401
    cause: "Authentication failed / Cookie expired"
    solution: "Run checkAuth() to diagnose, refresh credentials if needed"
    hint: "Check atlassian.xsrf.token ends with _lin (not _lout)"
  - code: 302
    cause: "SSO redirect"
    solution: "Cookie incomplete or expired, re-login with Remember Me"
  - code: 404
    cause: "Resource not found"
    solution: "Verify issue key or board ID exists"
  - code: 400
    cause: "Invalid request parameters"
    solution: "Check JQL syntax or field values"
  - code: 400_JQL
    cause: "JQL query error"
    solution: "Verify JQL syntax, check project key exists and user has access"
cookie_issues:
  - symptom: "atlassian.xsrf.token ends with _lout"
    cause: "User logged out"
    solution: "Re-login in browser, ensure token ends with _lin"
  - symptom: "Missing seraph.rememberme.cookie"
    cause: "Did not check Remember Me during login"
    solution: "Re-login with Remember Me checked"
  - symptom: "dotenv path error"
    cause: ".env file not found"
    solution: "Skill auto-searches cwd, ../../, ../, ./ paths"
```

## 使用示例

### 示例 1: 查询 BUG 状态

```javascript
const jira = require('jira-mcp-skill');

async function example1() {
  const status = await jira.getBugStatus(2162);
  
  console.log(`BUG Progress: ${status.progress}%`);
  console.log(`Total: ${status.total}, Completed: ${status.completed}`);
  
  if (status.highPriority.length > 0) {
    console.log('High Priority Bugs:', status.highPriority);
  }
}
```

### 示例 2: 创建开发任务

```javascript
const jira = require('jira-mcp-skill');

async function example2() {
  const result = await jira.createIssue({
    project: { key: 'ISID' },
    summary: '【开发】新功能开发',
    issuetype: { name: '任务' },
    assignee: { name: 'username' },
    customfield_10315: { value: '开发' },
    customfield_11443: { value: '维护（SP）' },
    customfield_10302: '2026-03-20',
    customfield_10303: '2026-03-25',
    customfield_10105: '5d'
  });
  
  return result.key;
}
```

### 示例 3: 创建子任务

```javascript
const jira = require('jira-mcp-skill');

async function example3() {
  const result = await jira.createSubtask('ISID-6874', '子任务标题', {
    projectKey: 'ISID',
    customFields: {
      assignee: { name: 'username' },
      customfield_10315: { value: '开发' }
    }
  });
  
  return result.key;
}
```

### 示例 4: 任务进度跟踪

```javascript
const jira = require('jira-mcp-skill');

async function example4() {
  const taskKeys = ['ISID-7010', 'ISID-7011', 'ISID-7012'];
  const progress = await jira.getTaskProgress(taskKeys);
  
  console.log(`Progress: ${progress.completed}/${progress.total} (${progress.progress}%)`);
  
  progress.issues.forEach(issue => {
    console.log(`${issue.key} [${issue.status}] ${issue.summary}`);
  });
}
```

## AI Agent 集成指南

### 安装 Skill

```bash
# 方法 1: npm 安装
npm install jira-mcp-skill

# 方法 2: 从 GitHub 安装
npm install git+https://github.com/tigerjibo/jira-mcp-skill.git

# 方法 3: 复制到 Trae AI skills 目录
mkdir -p .trae/skills
cp -r node_modules/jira-mcp-skill/.trae/skills/jira-mcp .trae/skills/
```

### 配置环境

```bash
# 创建 .env 文件
cp node_modules/jira-mcp-skill/.env.example .env

# 编辑 .env 文件
JIRA_BASE_URL=https://your-jira-url/jira
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx;
```

### 用户意图映射

```yaml
user_intents:
  - pattern: "查询.*BUG.*状态"
    action: getBugStatus
    params: { boardId: <extracted_board_id> }
  
  - pattern: "创建.*任务"
    action: createIssue
    params: { project, summary, issuetype }
  
  - pattern: "查询.*进度"
    action: getTaskProgress
    params: { taskKeys: <extracted_keys> }
  
  - pattern: "创建.*子任务"
    action: createSubtask
    params: { parentKey, summary }
```

## 安全注意事项

```yaml
security:
  - rule: "Never hardcode credentials"
  - rule: "Always use environment variables"
  - rule: ".env files must be in .gitignore"
  - rule: "Log only credential length, never content"
  - rule: "Validate user input before API calls"
```

## 文件结构

```
jira-mcp-skill/
├── package.json           # npm 配置
├── README.md              # 人类可读文档
├── AI-README.md           # AI 智能体文档 (本文件)
├── .env.example           # 环境变量示例
├── .gitignore             # Git 忽略配置
├── jira-client.js         # 核心 API 客户端
├── test.js                # 测试脚本
└── .trae/
    └── skills/
        └── jira-mcp/
            └── SKILL.md   # Trae AI Skill 定义
```
