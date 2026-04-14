#!/usr/bin/env node
/**
 * JIRA MCP CLI Tool - OpenClaw Skill Entry Point
 *
 * Usage:
 *   node jira-tool.js --action check-auth
 *   node jira-tool.js --action search --jql "project = ISID AND status != DONE"
 *   node jira-tool.js --action get-issue --key ISID-1234
 *   node jira-tool.js --action board-issues --board-id 2162 [--max 200]
 *   node jira-tool.js --action project-boards --project ISID
 *   node jira-tool.js --action projects
 *   node jira-tool.js --action versions --project IMPROVE1
 *   node jira-tool.js --action create --summary "任务标题" --project ISID [--type 任务] [--assignee username]
 *   node jira-tool.js --action create-subtask --parent ISID-1234 --summary "子任务标题" [--project ISID]
 *   node jira-tool.js --action create-improve --summary "结项门禁核查" [--assignee jibo] [--reporter wangqiang4]
 *   node jira-tool.js --action task-progress --keys ISID-7010,ISID-7011
 *   node jira-tool.js --action bug-status --board-id 2162
 *   node jira-tool.js --action open-tasks --keys ISID-7010,ISID-7011
 *   node jira-tool.js --action auth-status
 */

const path = require('path');

// Load jira-client from the same directory
const jira = require(path.join(__dirname, 'jira-client'));

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      parsed[key] = value;
      if (value !== true) i++;
    }
  }
  return parsed;
}

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function errorExit(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const action = args.action;

  if (!action) {
    console.log('JIRA MCP CLI Tool');
    console.log('Usage: node jira-tool.js --action <action> [options]');
    console.log('');
    console.log('Actions:');
    console.log('  check-auth              Check authentication status');
    console.log('  auth-status             Get auth config (no API call)');
    console.log('  search                  Search issues with --jql');
    console.log('  get-issue               Get issue details with --key');
    console.log('  board-issues            Get board issues with --board-id');
    console.log('  project-boards          Get project boards with --project');
    console.log('  projects                List all projects');
    console.log('  versions                Get project versions with --project');
    console.log('  create                  Create issue with --summary --project [--type] [--assignee]');
    console.log('  create-subtask          Create subtask with --parent --summary');
    console.log('  create-improve          Create IMPROVE1 task with --summary');
    console.log('  task-progress           Get progress with --keys (comma-separated)');
    console.log('  bug-status              Get bug report with --board-id');
    console.log('  open-tasks              Get open tasks by assignee with --keys');
    process.exit(0);
  }

  try {
    switch (action) {
      case 'check-auth': {
        const result = await jira.checkAuth();
        output({ ok: result.valid, ...result });
        break;
      }

      case 'auth-status': {
        const result = jira.getAuthStatus();
        output({ ok: result.configured, ...result });
        break;
      }

      case 'search': {
        if (!args.jql) errorExit('--jql is required for search action');
        const fields = args.fields || 'key,summary,status,assignee,priority';
        const maxResults = parseInt(args.max) || 50;
        const issues = await jira.searchIssues(args.jql, fields, maxResults);
        output({ ok: true, total: issues.length, issues });
        break;
      }

      case 'get-issue': {
        if (!args.key) errorExit('--key is required for get-issue action');
        const issue = await jira.getIssue(args.key);
        output({ ok: true, issue });
        break;
      }

      case 'board-issues': {
        if (!args['board-id']) errorExit('--board-id is required for board-issues action');
        const maxResults = parseInt(args.max) || 200;
        const issues = await jira.getBoardIssues(parseInt(args['board-id']), maxResults);
        output({ ok: true, total: issues.length, issues });
        break;
      }

      case 'project-boards': {
        if (!args.project) errorExit('--project is required for project-boards action');
        const boards = await jira.getProjectBoards(args.project);
        output({ ok: true, total: boards.length, boards });
        break;
      }

      case 'projects': {
        const projects = await jira.getProjects();
        output({ ok: true, total: projects.length, projects });
        break;
      }

      case 'versions': {
        if (!args.project) errorExit('--project is required for versions action');
        const versions = await jira.getProjectVersions(args.project);
        output({ ok: true, total: versions.length, versions });
        break;
      }

      case 'create': {
        if (!args.summary) errorExit('--summary is required for create action');
        if (!args.project) errorExit('--project is required for create action');
        const issueData = {
          fields: {
            project: { key: args.project },
            summary: args.summary,
            issuetype: { name: args.type || '任务' }
          }
        };
        if (args.assignee) issueData.fields.assignee = { name: args.assignee };
        if (args.description) issueData.fields.description = args.description;

        // Parse extra custom fields from --field key=value
        if (args.field) {
          const fields = Array.isArray(args.field) ? args.field : [args.field];
          for (const f of fields) {
            const [k, v] = f.split('=');
            if (k && v) issueData.fields[k] = v;
          }
        }

        const result = await jira.createIssue({ fields: issueData.fields });
        output({ ok: true, key: result.key, id: result.id, url: process.env.JIRA_BASE_URL + '/browse/' + result.key });
        break;
      }

      case 'create-subtask': {
        if (!args.parent) errorExit('--parent is required for create-subtask action');
        if (!args.summary) errorExit('--summary is required for create-subtask action');
        const opts = {};
        if (args.project) opts.projectKey = args.project;
        if (args.type) opts.issuetype = args.type;
        const result = await jira.createSubtask(args.parent, args.summary, opts);
        output({ ok: true, key: result.key, id: result.id });
        break;
      }

      case 'create-improve': {
        if (!args.summary) errorExit('--summary is required for create-improve action');
        const opts = {};
        if (args.assignee) opts.assignee = args.assignee;
        if (args.reporter) opts.reporter = args.reporter;
        if (args['project-type']) opts.projectType = args['project-type'];
        if (args['fix-version']) opts.fixVersion = args['fix-version'];
        const result = await jira.createImproveTask(args.summary, opts);
        output({ ok: true, key: result.key, id: result.id, url: process.env.JIRA_BASE_URL + '/browse/' + result.key });
        break;
      }

      case 'task-progress': {
        if (!args.keys) errorExit('--keys is required for task-progress action (comma-separated)');
        const keys = args.keys.split(',').map(k => k.trim());
        const result = await jira.getTaskProgress(keys);
        output({ ok: true, ...result });
        break;
      }

      case 'bug-status': {
        if (!args['board-id']) errorExit('--board-id is required for bug-status action');
        const result = await jira.getBugStatus(parseInt(args['board-id']));
        output({ ok: true, ...result });
        break;
      }

      case 'open-tasks': {
        if (!args.keys) errorExit('--keys is required for open-tasks action (comma-separated)');
        const keys = args.keys.split(',').map(k => k.trim());
        const result = await jira.getOpenTasksByAssignee(keys);
        output({ ok: true, ...result });
        break;
      }

      default:
        errorExit(`Unknown action: ${action}. Run without --action to see available actions.`);
    }
  } catch (err) {
    errorExit(err.message);
  }
}

main();
