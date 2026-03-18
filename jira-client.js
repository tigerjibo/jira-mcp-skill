const axios = require('axios');

let _client = null;

function getClient() {
  if (_client) return _client;
  
  const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
  const JIRA_COOKIES = process.env.JIRA_COOKIES || '';
  const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN || '';

  if (!JIRA_BASE_URL) {
    throw new Error('JIRA_BASE_URL environment variable is required');
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (JIRA_AUTH_TOKEN) {
    headers['Authorization'] = JIRA_AUTH_TOKEN;
  } else if (JIRA_COOKIES) {
    headers['Cookie'] = JIRA_COOKIES;
  } else {
    throw new Error('Either JIRA_COOKIES or JIRA_AUTH_TOKEN is required');
  }

  _client = axios.create({
    baseURL: JIRA_BASE_URL,
    headers,
    maxRedirects: 0
  });
  
  return _client;
}

function resetClient() {
  _client = null;
}

async function searchIssues(jql, fields = 'key,summary,status,assignee,priority', maxResults = 50) {
  const resp = await getClient().get('/rest/api/2/search', {
    params: { jql, fields, maxResults }
  });
  return resp.data.issues || [];
}

async function getIssue(issueKey) {
  const resp = await getClient().get(`/rest/api/2/issue/${issueKey}`);
  return resp.data;
}

async function getBoardIssues(boardId, maxResults = 200) {
  const resp = await getClient().get(`/rest/agile/1.0/board/${boardId}/issue`, {
    params: { maxResults }
  });
  return resp.data.issues || [];
}

async function getProjectBoards(projectKey) {
  const resp = await getClient().get('/rest/agile/1.0/board', {
    params: { projectKeyOrId: projectKey }
  });
  return resp.data.values || [];
}

async function getProjects() {
  const resp = await getClient().get('/rest/api/2/project');
  return resp.data || [];
}

async function createIssue(issueData) {
  const resp = await getClient().post('/rest/api/2/issue', issueData);
  return resp.data;
}

async function createSubtask(parentKey, summary, options = {}) {
  const issueData = {
    project: { key: options.projectKey || extractProjectKey(parentKey) },
    parent: { key: parentKey },
    summary,
    issuetype: { name: options.issuetype || 'Sub-task' },
    ...options.customFields
  };
  return createIssue(issueData);
}

function extractProjectKey(issueKey) {
  const match = issueKey.match(/^([A-Z]+)-/);
  return match ? match[1] : 'DEFAULT';
}

async function getTaskProgress(taskKeys) {
  const jql = `key IN (${taskKeys.join(',')})`;
  const issues = await searchIssues(jql, 'key,summary,status,assignee');
  
  const doneStatus = ['DONE', '已完成', 'Resolved', 'Closed'];
  const completed = issues.filter(i => doneStatus.includes(i.fields.status?.name));
  
  return {
    total: issues.length,
    completed: completed.length,
    progress: issues.length > 0 ? Math.round(completed.length / issues.length * 100) : 0,
    issues: issues.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name,
      assignee: i.fields.assignee?.displayName
    }))
  };
}

async function getBugStatus(boardId) {
  const issues = await getBoardIssues(boardId);
  
  const statusCount = {};
  issues.forEach(i => {
    const s = i.fields.status?.name || 'Unknown';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  
  const doneStatus = ['RESOLVED', 'VERIFIED', 'Closed'];
  const completed = issues.filter(i => doneStatus.includes(i.fields.status?.name));
  const openBugs = issues.filter(i => !doneStatus.includes(i.fields.status?.name));
  const highPriority = openBugs.filter(i => 
    ['Highest', 'High', 'Critical', 'Blocker'].includes(i.fields.priority?.name)
  );
  
  return {
    total: issues.length,
    completed: completed.length,
    progress: issues.length > 0 ? Math.round(completed.length / issues.length * 100) : 0,
    statusDistribution: statusCount,
    openBugs: openBugs.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName
    })),
    highPriority: highPriority.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      priority: i.fields.priority?.name
    }))
  };
}

async function getOpenTasksByAssignee(taskKeys) {
  const jql = `key IN (${taskKeys.join(',')})`;
  const issues = await searchIssues(jql, 'key,summary,status,assignee');
  
  const doneStatus = ['DONE', '已完成', 'Resolved', 'Closed'];
  const openTasks = issues.filter(i => !doneStatus.includes(i.fields.status?.name));
  
  const byAssignee = {};
  openTasks.forEach(i => {
    const name = i.fields.assignee?.displayName || 'Unassigned';
    if (!byAssignee[name]) byAssignee[name] = [];
    byAssignee[name].push({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name
    });
  });
  
  return {
    total: issues.length,
    openCount: openTasks.length,
    byAssignee
  };
}

module.exports = {
  getClient,
  resetClient,
  searchIssues,
  getIssue,
  getBoardIssues,
  getProjectBoards,
  getProjects,
  createIssue,
  createSubtask,
  getTaskProgress,
  getBugStatus,
  getOpenTasksByAssignee
};
