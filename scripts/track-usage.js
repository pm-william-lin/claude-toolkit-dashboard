import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const USAGE_PATH = join(import.meta.dirname, '..', 'usage.json');

async function main() {
  const toolName = process.argv[2];
  if (!toolName) {
    console.error('Usage: node track-usage.js <tool_name>');
    process.exit(1);
  }

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

main().catch(console.error);
