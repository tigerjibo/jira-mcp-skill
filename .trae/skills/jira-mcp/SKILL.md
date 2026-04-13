---
name: "jira-mcp"
description: "JIRA project management operations including task creation, progress tracking, bug status, and board management. Invoke when user needs to create JIRA tasks, check project progress, query bug status, or manage JIRA issues."
---

# JIRA MCP Skill

This skill provides comprehensive JIRA project management capabilities through direct API calls.

## Prerequisites

1. Create `.env` file in project root:
```bash
JIRA_BASE_URL=https://your-jira-url/jira
JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx_lin; seraph.rememberme.cookie=xxx
```

2. Install dependencies:
```bash
npm install axios dotenv
```

## Cookie Authentication Guide

### How to Get Valid Cookies

1. Open `https://your-jira-url/jira` in browser and **login**
2. **Check "Remember Me"** — this is critical for `seraph.rememberme.cookie`
3. Press **F12** → **Application** → **Cookies** → select JIRA domain
4. Copy the following cookies in `key=value` format separated by `;`:

| Cookie Name | Required | Notes |
|-------------|----------|-------|
| `JSESSIONID` | Yes | Path must be `/jira` |
| `atlassian.xsrf.token` | Yes | Must end with `_lin` (not `_lout`) |
| `seraph.rememberme.cookie` | Yes | Only present when "Remember Me" is checked |
| `ngx_jira` | Recommended | Load balancer routing |

### Cookie Format Example

```
JSESSIONID=A2804783A2950FC80743E2077B6E1011; atlassian.xsrf.token=BW0V-G7S3-B591-HO9N_xxx_lin; seraph.rememberme.cookie=2257687%3A930cc1c202f26ff1e7f3f3de14b4c3fa9ea1d996; ngx_jira=192.168.142.201:8080
```

### Cookie Validation

The skill automatically validates cookie format before API calls:

- `atlassian.xsrf.token` ending with `_lout` → **已登出**，需要重新登录
- `atlassian.xsrf.token` ending with `_lin` → **已登录**，正常
- Missing `seraph.rememberme.cookie` → 需要在登录时勾选"记住我"

## Available Operations

### Authentication Functions

| Function | Description |
|----------|-------------|
| `checkAuth()` | Verify authentication status, returns user info |
| `getAuthStatus()` | Get current auth configuration (no API call) |
| `validateCookieFormat(cookies)` | Validate cookie format and completeness |
| `ensureAuthenticated()` | Pre-check before API calls |

### Core Functions

| Function | Description |
|----------|-------------|
| `searchIssues(jql, fields, maxResults)` | Search issues with JQL |
| `getIssue(issueKey)` | Get single issue details |
| `getBoardIssues(boardId, maxResults)` | Get all issues on a board |
| `getProjectBoards(projectKey)` | Get boards for a project |
| `getProjects()` | List all projects |
| `createIssue(issueData)` | Create new issue |
| `createSubtask(parentKey, summary, options)` | Create subtask |

### Convenience Functions

| Function | Description |
|----------|-------------|
| `getTaskProgress(taskKeys)` | Get task completion progress |
| `getBugStatus(boardId)` | Get bug status report |
| `getOpenTasksByAssignee(taskKeys)` | Group open tasks by assignee |

## Usage Examples

### Check Authentication

```javascript
const jira = require('./jira-client');

const auth = await jira.checkAuth();
if (!auth.valid) {
  console.log('Auth failed:', auth.error);
  console.log('Hint:', auth.hint);
}

const cookieStatus = jira.validateCookieFormat(process.env.JIRA_COOKIES);
if (!cookieStatus.valid) {
  console.log('Cookie issues:', cookieStatus.issues);
}
```

### Task Progress Tracking

```javascript
const progress = await jira.getTaskProgress(['ISID-7010', 'ISID-7011']);
console.log(`Progress: ${progress.progress}%`);
```

### Bug Status Report

```javascript
const status = await jira.getBugStatus(2162);
console.log(`BUG Progress: ${status.progress}%`);
console.log('High Priority:', status.highPriority);
```

### Create Task

```javascript
await jira.createIssue({
  project: { key: 'ISID' },
  summary: 'New Task',
  issuetype: { name: 'Task' },
  assignee: { name: 'username' }
});
```

## Custom Fields Reference

| Field Name | Field ID | Description |
|------------|----------|-------------|
| Task Type | customfield_10315 | Development/Test/Design |
| Project Type | customfield_11443 | Maintenance(SP)/Feature |
| Start Date | customfield_10302 | Date format |
| End Date | customfield_10303 | Date format |
| Estimate | customfield_10105 | Time estimate (e.g., 5d) |

## Troubleshooting

### Common Cookie Errors

| Symptom | Cause | Solution |
|---------|-------|----------|
| 401 Unauthorized | Cookie expired | Re-login and update cookies |
| 401 + `_lout` token | Logged out state | Re-login, ensure token ends with `_lin` |
| 302 Redirect | SSO redirect | Cookie incomplete or invalid |
| Missing `seraph.rememberme.cookie` | Didn't check "Remember Me" | Re-login with "Remember Me" checked |
| dotenv path error | `.env` not found | Skill auto-searches multiple paths |

### Common API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 | Cookie expired or invalid | Run `checkAuth()` to diagnose |
| 302 | SSO redirect | Check cookie format |
| 404 | Invalid ID | Verify the ID exists |
| 400 JQL error | Invalid JQL syntax | Check JQL query syntax |
| 400 field error | Invalid custom field value | Verify field ID and allowed values |

### Auto .env Loading

The skill automatically searches for `.env` in these paths (in order):
1. `process.cwd()/.env`
2. `../../.env` (from skill directory)
3. `../.env`
4. `./.env`

## Authentication

### Method 1: Cookies (Recommended for SSO)

1. Login to JIRA in browser (check "Remember Me")
2. Press F12 → Application → Cookies
3. Copy required cookies (see Cookie Authentication Guide above)

### Method 2: Bearer Token

1. Login to JIRA
2. Find request with Authorization header in dev tools
3. Copy the full Bearer token
