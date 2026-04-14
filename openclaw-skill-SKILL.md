---
name: jira-mcp
description: "JIRA任务级查询与操作。当用户提到"JIRA"、"任务进度"、"BUG状态"、"看板"、"子任务"、"JQL"、或在JIRA上查/建/改任务时触发。与portal-workflow的区别：portal管配置管理（代码仓库、文档、制品入库），jira-mcp管任务级数据（任务列表、完成率、BUG分布、经办人进度）。"
metadata:
  emoji: 📋
  depends_on: []
  provides_to: []
compatibility:
  node: ">=14.0.0"
---

# JIRA MCP Skill

JIRA 任务管理 CLI 工具。支持任务创建、JQL 搜索、进度跟踪、BUG 状态、看板查询。

## 与 portal-workflow 的路由规则（重要！）

| 用户意图 | 用哪个 Skill | 原因 |
|---------|-------------|------|
| 查项目**任务进度**、**BUG**、**任务列表**、**完成率** | **jira-mcp**（本 skill） | 任务级数据在 JIRA |
| 查**立项审查**、**结项审查**、**配置管理**、**制品入库** | portal-workflow | 配置管理数据在 Portal |
| "查项目进度" | **jira-mcp**（本 skill） | 进度 = JIRA 任务完成率，不是 Portal 状态 |
| "项目审查" / "结项申请" | portal-workflow | 审查流程在 Portal |

**判断原则**：用户问的是"**任务做得怎么样**"用 jira-mcp，问的是"**配置管理过没过**"用 portal-workflow。

**优先级**：当用户说"查项目进度"、"项目进展"、"任务完成情况"时，jira-mcp 优先于 portal-workflow。

## Trigger（触发条件）

当用户提到以下内容时触发此 Skill：
- "JIRA"、"jira"
- "任务进度"、"项目进度"、"项目进展"、"任务完成率"、"完成情况"
- "BUG状态"、"BUG列表"、"BUG报告"
- "看板"、"Sprint"
- "子任务"
- "JQL搜索"
- "在JIRA上查询/创建/搜索"
- 提到 JIRA issue key（如 ISID-1234）
- "经办人"、"assignee"
- "任务列表"、"问题列表"

**不触发**（由 portal-workflow 处理）：
- "立项审查"、"结项审查"、"配置管理审查"
- "制品入库"、"代码仓库状态"、"文档仓库"
- "portal"

## Tool Entrypoint

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action <action> [options]
```

**重要**: 所有操作都通过上面的 CLI 命令执行，输出 JSON 格式结果。不要试图安装 jira-cli 或其他工具。

## Quick Examples

### 1) Check Authentication

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action check-auth
```

### 2) Search Issues (JQL)

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action search --jql "project = ISID AND status != DONE"
```

Search by version/fixVersion（查某个版本的所有任务）:

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action search --jql "project = ISID AND fixVersion = V2.0R02F03SP04" --fields "key,summary,status,assignee,priority"
```

### 3) Get Issue Details

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action get-issue --key ISID-1234
```

### 4) Get Board Issues

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action board-issues --board-id 2162 --max 200
```

### 5) Get Project Boards

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action project-boards --project ISID
```

### 6) List All Projects

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action projects
```

### 7) Get Project Versions

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action versions --project ISID
```

### 8) Create Issue

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action create --project ISID --summary "任务标题" --type "任务" --assignee username
```

### 9) Create Subtask

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action create-subtask --parent ISID-1234 --summary "子任务标题" --project ISID
```

### 10) Create IMPROVE1 Task

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action create-improve --summary "【结项门禁核查】项目名" --assignee jibo --reporter wangqiang4
```

### 11) Task Progress

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action task-progress --keys "ISID-7010,ISID-7011"
```

### 12) Bug Status Report

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action bug-status --board-id 2162
```

### 13) Open Tasks by Assignee

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action open-tasks --keys "ISID-7010,ISID-7011"
```

## Actions Reference

| Action | Required Params | Optional Params | Description |
|--------|----------------|-----------------|-------------|
| `check-auth` | none | - | Verify JIRA authentication |
| `auth-status` | none | - | Get auth config (no API call) |
| `search` | `--jql` | `--fields`, `--max` | Search with JQL query |
| `get-issue` | `--key` | - | Get single issue details |
| `board-issues` | `--board-id` | `--max` | Get board issues |
| `project-boards` | `--project` | - | Get project boards |
| `projects` | none | - | List all accessible projects |
| `versions` | `--project` | - | Get project versions |
| `create` | `--summary`, `--project` | `--type`, `--assignee`, `--description` | Create new issue |
| `create-subtask` | `--parent`, `--summary` | `--project`, `--type` | Create subtask |
| `create-improve` | `--summary` | `--assignee`, `--reporter`, `--project-type`, `--fix-version` | Create IMPROVE1 task |
| `task-progress` | `--keys` (comma-sep) | - | Get task completion progress |
| `bug-status` | `--board-id` | - | Get bug status report |
| `open-tasks` | `--keys` (comma-sep) | - | Group open tasks by assignee |

## User Intent Mapping

When user says:

| User Intent | Action to Use |
|-------------|--------------|
| 查询项目进度 / 项目状态 / 项目进展 | `versions --project XXX` 获取版本列表，然后 `search --jql "project = XXX AND fixVersion = VERSION"` 统计完成率 |
| 查BUG状态 | `bug-status --board-id XXX` |
| 查任务进度 | `task-progress --keys "KEY1,KEY2"` |
| 创建任务 | `create --project XXX --summary "..."` |
| 创建子任务 | `create-subtask --parent XXX --summary "..."` |
| 查某个问题详情 | `get-issue --key XXX` |
| 查看板 | `board-issues --board-id XXX` or `project-boards --project XXX` |
| 查版本 | `versions --project XXX` |
| 结项门禁核查 | `create-improve --summary "..."` |

## Custom Fields

| Field | ID | Common Values |
|-------|-----|---------------|
| Task Type | customfield_10315 | 开发/测试/设计 |
| Project Type | customfield_11443 | 维护（SP）/功能 |
| Start Date | customfield_10302 | YYYY-MM-DD |
| End Date | customfield_10303 | YYYY-MM-DD |
| Estimate | customfield_10105 | Xd |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `ok: false, error: "认证失败 (401)"` | Cookie expired | Re-login browser, update .env |
| `atlassian.xsrf.token ... _lout` | Logged out | Re-login, ensure token ends with `_lin` |
| `ok: false, error: "... 302 ..."` | SSO redirect | Cookie incomplete |

## Configuration

Credentials stored in `/home/tiger/jira-mcp-skill/.env`:
- `JIRA_BASE_URL` - JIRA server URL
- `JIRA_COOKIES` - Cookie auth string (JSESSIONID, xsrf token, rememberme cookie)
