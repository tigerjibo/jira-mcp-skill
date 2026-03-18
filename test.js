require('dotenv').config();
const jira = require('./jira-client');

async function main() {
  console.log('=== JIRA MCP Skill Test ===\n');
  
  console.log('Configuration:');
  console.log('  JIRA_BASE_URL:', process.env.JIRA_BASE_URL || '(not set)');
  console.log('  JIRA_COOKIES:', process.env.JIRA_COOKIES ? '(set, ' + process.env.JIRA_COOKIES.length + ' chars)' : '(not set)');
  console.log('  JIRA_AUTH_TOKEN:', process.env.JIRA_AUTH_TOKEN ? '(set)' : '(not set)');
  console.log('');
  
  console.log('1. Testing getProjects...');
  try {
    const projects = await jira.getProjects();
    console.log(`   ✓ Found ${projects.length} projects\n`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}\n`);
    console.log('Please check your JIRA_BASE_URL and authentication credentials.');
    return;
  }
  
  console.log('2. Testing searchIssues...');
  try {
    const issues = await jira.searchIssues('project IS NOT EMPTY', 'key,summary', 5);
    console.log(`   ✓ Found ${issues.length} issues (showing first 5)\n`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}\n`);
  }
  
  console.log('=== Test Complete ===');
}

main().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
