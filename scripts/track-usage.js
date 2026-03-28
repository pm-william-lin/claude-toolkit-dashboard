import { readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { homedir } from 'os';

const USAGE_PATH = join(import.meta.dirname, '..', 'usage.json');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function getProjectName(cwd) {
  if (!cwd) return 'unknown';
  const home = homedir();
  // If cwd is home dir, label as "~"
  if (cwd === home) return '~';
  // Use the directory name as project name
  return basename(cwd);
}

async function main() {
  let toolName;
  let category; // 'skills' or 'mcpTools'
  let itemName; // clean name for byProject
  let projectName = getProjectName(process.env.PWD || process.cwd());

  // If called with CLI arg, use that directly (manual mode)
  if (process.argv[2]) {
    toolName = process.argv[2];
    category = 'skills';
    itemName = process.argv[2];
  } else {
    // Read from stdin (PostToolUse hook passes JSON)
    try {
      const input = await readStdin();
      const data = JSON.parse(input);
      const name = data.tool_name || '';

      // Extract project from cwd if available
      if (data.cwd) {
        projectName = getProjectName(data.cwd);
      }

      if (name === 'Skill') {
        const skillName = data.tool_input?.skill || 'unknown-skill';
        toolName = 'skill:' + skillName;
        category = 'skills';
        itemName = skillName;
      } else if (name.startsWith('mcp__')) {
        const parts = name.split('__');
        const server = parts[1] || '';
        const tool = parts.slice(2).join('__') || '';
        toolName = server + ':' + tool;
        category = 'mcpTools';
        itemName = toolName;
      } else if (name === 'Agent') {
        const agentType = data.tool_input?.subagent_type || 'general-purpose';
        toolName = 'agent:' + agentType;
        category = 'agents';
        itemName = agentType;
      } else {
        // Not a skill, agent, or MCP tool — skip
        process.exit(0);
      }
    } catch {
      process.exit(0);
    }
  }

  if (!toolName) process.exit(0);

  let usage;
  try {
    usage = JSON.parse(await readFile(USAGE_PATH, 'utf-8'));
  } catch {
    usage = { lastUpdated: null, tools: {}, byProject: {} };
  }

  // Ensure byProject structure exists
  if (!usage.byProject) usage.byProject = {};

  // Global count
  usage.tools[toolName] = (usage.tools[toolName] || 0) + 1;
  usage.lastUpdated = new Date().toISOString();

  // Per-project count
  if (!usage.byProject[projectName]) {
    usage.byProject[projectName] = { skills: {}, agents: {}, mcpTools: {} };
  }
  const proj = usage.byProject[projectName];
  if (!proj[category]) proj[category] = {};
  proj[category][itemName] = (proj[category][itemName] || 0) + 1;

  await writeFile(USAGE_PATH, JSON.stringify(usage, null, 2));
}

main().catch(() => process.exit(0));
