import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const USAGE_PATH = join(import.meta.dirname, '..', 'usage.json');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function main() {
  let toolName;

  // If called with CLI arg, use that directly
  if (process.argv[2]) {
    toolName = process.argv[2];
  } else {
    // Read from stdin (PostToolUse hook passes JSON)
    try {
      const input = await readStdin();
      const data = JSON.parse(input);
      const name = data.tool_name || '';

      // Only track Skills and MCP tools
      if (name === 'Skill') {
        // Track which skill was invoked
        const skillName = data.tool_input?.skill || 'unknown-skill';
        toolName = 'skill:' + skillName;
      } else if (name.startsWith('mcp__')) {
        // MCP tools: mcp__n8n-mcp__n8n_create_workflow → n8n-mcp:n8n_create_workflow
        const parts = name.split('__');
        const server = parts[1] || '';
        const tool = parts.slice(2).join('__') || '';
        toolName = server + ':' + tool;
      } else {
        // Not a skill or MCP tool, skip
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
    usage = { lastUpdated: null, tools: {} };
  }

  usage.tools[toolName] = (usage.tools[toolName] || 0) + 1;
  usage.lastUpdated = new Date().toISOString();

  await writeFile(USAGE_PATH, JSON.stringify(usage, null, 2));
}

main().catch(() => process.exit(0));
