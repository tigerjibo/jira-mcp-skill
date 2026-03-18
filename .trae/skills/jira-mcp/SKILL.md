---
name: "jira-mcp"
description: "JIRA project management operations including task creation, progress tracking, bug status, and board management. Invoke when user needs to create JIRA tasks, check project progress, query bug status, or manage JIRA issues."
---

# JIRA MCP Skill

This skill provides comprehensive JIRA project management capabilities through direct API calls.

## Prerequisites

1. Configure environment variables:
```bash
export JIRA_BASE_URL=https://your-jira-url/jira
export JIRA_COOKIES="JSESSIONID=xxx; atlassian.xsrf.token=xxx;"
```

2. Install axios:
```bash
npm install axios
```

## Available Operations

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

### Task Progress Tracking

```javascript
const jira = require('./jira-client');

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

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 | Cookie expired | Refresh authentication |
| 302 | SSO redirect | Check cookie format |
| 404 | Invalid ID | Verify the ID exists |

## Authentication

### Method 1: Cookies (Recommended for SSO)

1. Login to JIRA in browser
2. Press F12 -> Network tab
3. Click any `/rest/api/` request
4. Copy the Cookie header value

### Method 2: Bearer Token

1. Login to JIRA
2. Find request with Authorization header in dev tools
3. Copy the full Bearer token
