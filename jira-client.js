const axios = require('axios');
const path = require('path');
const fs = require('fs');

let _client = null;
let _envLoaded = false;

function loadEnv() {
  if (_envLoaded) return;
  _envLoaded = true;

  const dotenv = tryRequire('dotenv');
  if (!dotenv) return;

  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return;
    }
  }
}

function tryRequire(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}

function validateCookieFormat(cookies) {
  if (!cookies) return { valid: false, reason: 'Cookie 为空', issues: ['Cookie 为空'] };

  const issues = [];

  if (!cookies.includes('JSESSIONID')) {
    issues.push('缺少 JSESSIONID');
  }

  if (cookies.includes('atlassian.xsrf.token')) {
    const match = cookies.match(/atlassian\.xsrf\.token=[^;]+/);
    if (match) {
      const token = match[0];
      if (token.endsWith('_lout')) {
        issues.push('atlassian.xsrf.token 以 _lout 结尾（已登出状态），需要以 _lin 结尾（已登录状态）');
      }
    }
  } else {
    issues.push('缺少 atlassian.xsrf.token');
  }

  if (!cookies.includes('seraph.rememberme.cookie')) {
    issues.push('缺少 seraph.rememberme.cookie（需在浏览器登录时勾选"记住我"）');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function getAuthStatus() {
  loadEnv();
  const cookies = process.env.JIRA_COOKIES || '';
  const token = process.env.JIRA_AUTH_TOKEN || '';
  const baseUrl = process.env.JIRA_BASE_URL || '';

  return {
    configured: !!(baseUrl && (cookies || token)),
    authMethod: token ? 'Bearer Token' : cookies ? 'Cookies' : 'None',
    baseUrl,
    cookieValidation: cookies ? validateCookieFormat(cookies) : null
  };
}

async function checkAuth() {
  loadEnv();
  try {
    const client = getClient();
    const resp = await client.get('/rest/api/2/myself');
    return {
      valid: true,
      user: resp.data.displayName,
      username: resp.data.name,
      error: null
    };
  } catch (err) {
    const status = err.response?.status;
    let errorMsg = err.message;
    let hint = '';

    if (status === 401) {
      errorMsg = '认证失败 (401)';
      const cookieVal = validateCookieFormat(process.env.JIRA_COOKIES || '');
      if (!cookieVal.valid) {
        hint = 'Cookie 问题: ' + cookieVal.issues.join('; ');
      } else {
        hint = 'Cookie 可能已过期，请重新获取。确保 atlassian.xsrf.token 以 _lin 结尾，且包含 seraph.rememberme.cookie';
      }
    } else if (status === 302) {
      errorMsg = '被重定向 (302)，可能是 SSO 登录页';
      hint = 'Cookie 不完整或已失效，请重新从浏览器获取完整 Cookie';
    }

    return {
      valid: false,
      user: null,
      username: null,
      error: errorMsg,
      hint
    };
  }
}

function getClient() {
  if (_client) return _client;

  loadEnv();

  const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
  const JIRA_COOKIES = process.env.JIRA_COOKIES || '';
  const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN || '';

  if (!JIRA_BASE_URL) {
    throw new Error('JIRA_BASE_URL environment variable is required. Create .env file with JIRA_BASE_URL=https://your-jira-url/jira');
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
    throw new Error(
      'Authentication required. Set JIRA_COOKIES or JIRA_AUTH_TOKEN in .env file.\n' +
      'For Cookie auth: JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx_lin; seraph.rememberme.cookie=xxx'
    );
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

async function ensureAuthenticated() {
  const status = getAuthStatus();
  if (!status.configured) {
    throw new Error(
      'JIRA 认证未配置。请在 .env 文件中设置:\n' +
      '  JIRA_BASE_URL=https://your-jira-url/jira\n' +
      '  JIRA_COOKIES=JSESSIONID=xxx; atlassian.xsrf.token=xxx_lin; seraph.rememberme.cookie=xxx'
    );
  }
  if (status.cookieValidation && !status.cookieValidation.valid) {
    console.warn('[jira-mcp] Cookie 验证警告:', status.cookieValidation.issues.join('; '));
  }
}

async function searchIssues(jql, fields = 'key,summary,status,assignee,priority', maxResults = 50) {
  await ensureAuthenticated();
  const resp = await getClient().get('/rest/api/2/search', {
    params: { jql, fields, maxResults }
  });
  return resp.data.issues || [];
}

async function getIssue(issueKey) {
  await ensureAuthenticated();
  const resp = await getClient().get(`/rest/api/2/issue/${issueKey}`);
  return resp.data;
}

async function getBoardIssues(boardId, maxResults = 200) {
  await ensureAuthenticated();
  const resp = await getClient().get(`/rest/agile/1.0/board/${boardId}/issue`, {
    params: { maxResults }
  });
  return resp.data.issues || [];
}

async function getProjectBoards(projectKey) {
  await ensureAuthenticated();
  const resp = await getClient().get('/rest/agile/1.0/board', {
    params: { projectKeyOrId: projectKey }
  });
  return resp.data.values || [];
}

async function getProjects() {
  await ensureAuthenticated();
  const resp = await getClient().get('/rest/api/2/project');
  return resp.data || [];
}

async function getProjectVersions(projectKey) {
  await ensureAuthenticated();
  const resp = await getClient().get(`/rest/api/2/project/${projectKey}/versions`);
  return resp.data || [];
}

async function getCustomFieldOptions(fieldId) {
  await ensureAuthenticated();
  const resp = await getClient().get(`/rest/api/2/customFieldOption/${fieldId}/children`);
  return resp.data || [];
}

async function createImproveTask(summary, options = {}) {
  await ensureAuthenticated();
  
  const { 
    assignee = 'jibo', // 默认冀博
    reporter = 'wangqiang4', // 默认王强
    projectType = '公共支持',
    fixVersion = '2026年年度过程改进'
  } = options;
  
  try {
    // 获取项目版本
    const versions = await getProjectVersions('IMPROVE1');
    const targetVersion = versions.find(v => v.name === fixVersion);
    if (!targetVersion) {
      throw new Error(`未找到版本: ${fixVersion}`);
    }
    
    // 项目类型字段 ID (从之前的查询中获取)
    const projectTypeFieldId = '23626'; // 公共支持的 ID
    
    const issueData = {
      fields: {
        project: { key: 'IMPROVE1' },
        summary,
        issuetype: { name: '任务' },
        assignee: { name: assignee },
        reporter: { name: reporter },
        customfield_11443: { id: projectTypeFieldId }, // 项目类型
        fixVersions: [{ id: targetVersion.id }] // 修复版本
      }
    };
    
    return await createIssue(issueData);
  } catch (error) {
    throw new Error(`创建 IMPROVE1 任务失败: ${error.message}`);
  }
}

async function createIssue(issueData) {
  await ensureAuthenticated();
  try {
    const resp = await getClient().post('/rest/api/2/issue', issueData);
    return resp.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        let errorMessage = '创建任务失败 (400)';
        if (data.errors) {
          const errorDetails = Object.entries(data.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ');
          errorMessage += `: ${errorDetails}`;
        }
        throw new Error(errorMessage);
      } else if (status === 500) {
        throw new Error('创建任务失败 (500): 内部服务器错误，请检查字段格式是否正确');
      }
    }
    throw error;
  }
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
  loadEnv,
  validateCookieFormat,
  getAuthStatus,
  checkAuth,
  ensureAuthenticated,
  searchIssues,
  getIssue,
  getBoardIssues,
  getProjectBoards,
  getProjects,
  getProjectVersions,
  getCustomFieldOptions,
  createIssue,
  createImproveTask,
  createSubtask,
  getTaskProgress,
  getBugStatus,
  getOpenTasksByAssignee
};
