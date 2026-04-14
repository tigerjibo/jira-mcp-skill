---
name: jira-mcp
description: Use when user mentions JIRA, task tracking, bug reports, sprint progress, project boards, or asks to create/search/manage JIRA issues. Triggers on Chinese keywords like 任务, 进度, BUG, 看板, 子任务, JIRA, 结项.
metadata:
  emoji: 📋
  depends_on: []
  provides_to: []
compatibility:
  node: ">=14.0.0"
---

# JIRA MCP Skill

JIRA 项目管理 CLI 工具。支持任务创建、JQL 搜索、进度跟踪、BUG 状态、看板查询。

## Tool Entrypoint

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action <action> [options]
```

**重要**: 所有操作都通过上面的 CLI 命令执行，输出 JSON 格式结果。

## Quick Examples

### 1) Check Authentication

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action check-auth
```

### 2) Search Issues (JQL)

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action search --jql "project = ISID AND status != DONE"
```

Search by version/fixVersion:

```bash
node /home/tiger/jira-mcp-skill/jira-tool.js --action search --jql "project = ISID AND fixVersion = 'PVM-ISID-V2.0R02F03SP04'" --fields "key,summary,status,assignee,priority"
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
node /home/tiger/jira-mcp-skill/jira-tool.js --action versions --project IMPROVE1
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
| 查询项目进度 / 项目状态 | `search --jql "project = XXX AND fixVersion = 'VERSION'"` then summarize |
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
