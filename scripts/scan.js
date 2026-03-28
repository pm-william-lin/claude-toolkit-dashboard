import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const PLUGINS_CACHE = join(CLAUDE_DIR, 'plugins', 'cache');
const MCP_JSON = join(homedir(), '.mcp.json');
const OUTPUT = join(import.meta.dirname, '..', 'data.json');

async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch { return null; }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};
  let currentKey = null;
  let multiline = false;

  for (const line of yaml.split('\n')) {
    if (multiline) {
      if (line.match(/^\S/) && line.includes(':')) {
        multiline = false;
      } else {
        result[currentKey] = (result[currentKey] || '') + line.trim() + ' ';
        continue;
      }
    }
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === '|' || val === '>') {
        multiline = true;
        result[currentKey] = '';
      } else {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
      }
    }
  }

  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key] = result[key].trim();
    }
  }
  return result;
}

async function scanPlugins() {
  const plugins = [];
  if (!await fileExists(PLUGINS_CACHE)) return plugins;

  const publishers = await readdir(PLUGINS_CACHE);
  for (const publisher of publishers) {
    const pubDir = join(PLUGINS_CACHE, publisher);
    const pubStat = await stat(pubDir);
    if (!pubStat.isDirectory()) continue;
    const pluginNames = await readdir(pubDir);
    for (const pluginName of pluginNames) {
      const pluginDir = join(pubDir, pluginName);
      const pluginStat = await stat(pluginDir);
      if (!pluginStat.isDirectory()) continue;
      const versions = await readdir(pluginDir);
      for (const version of versions) {
        const versionDir = join(pluginDir, version);
        const vStat = await stat(versionDir);
        if (!vStat.isDirectory()) continue;
        const pluginJson = await readJson(join(versionDir, '.claude-plugin', 'plugin.json'));
        const packageJson = await readJson(join(versionDir, 'package.json'));
        plugins.push({
          name: pluginJson?.name || packageJson?.name || pluginName,
          version: packageJson?.version || version,
          source: publisher,
          description: pluginJson?.description || packageJson?.description || '',
          author: packageJson?.author || '',
        });
      }
    }
  }
  return plugins;
}

async function scanSkills() {
  const skills = [];
  if (!await fileExists(PLUGINS_CACHE)) return skills;

  const publishers = await readdir(PLUGINS_CACHE);
  for (const publisher of publishers) {
    const pubDir = join(PLUGINS_CACHE, publisher);
    const pubStat = await stat(pubDir);
    if (!pubStat.isDirectory()) continue;
    const pluginNames = await readdir(pubDir);
    for (const pluginName of pluginNames) {
      const pluginDir = join(pubDir, pluginName);
      const pluginStat = await stat(pluginDir);
      if (!pluginStat.isDirectory()) continue;
      const versions = await readdir(pluginDir);
      for (const version of versions) {
        const versionDir = join(pluginDir, version);
        const skillsDir = join(versionDir, 'skills');
        if (!await fileExists(skillsDir)) continue;
        const skillDirs = await readdir(skillsDir);
        for (const skillDir of skillDirs) {
          const skillPath = join(skillsDir, skillDir);
          const sStat = await stat(skillPath);
          if (!sStat.isDirectory()) continue;
          const skillFile = join(skillPath, 'SKILL.md');
          if (!await fileExists(skillFile)) continue;
          const content = await readFile(skillFile, 'utf-8');
          const fm = parseFrontmatter(content);
          skills.push({
            name: fm.name || skillDir,
            plugin: pluginName,
            description: fm.description || '',
          });
        }
      }
    }
  }
  return skills;
}

async function scanAgents() {
  const agents = [];
  if (!await fileExists(PLUGINS_CACHE)) return agents;

  const publishers = await readdir(PLUGINS_CACHE);
  for (const publisher of publishers) {
    const pubDir = join(PLUGINS_CACHE, publisher);
    const pubStat = await stat(pubDir);
    if (!pubStat.isDirectory()) continue;
    const pluginNames = await readdir(pubDir);
    for (const pluginName of pluginNames) {
      const pluginDir = join(pubDir, pluginName);
      const pluginStat = await stat(pluginDir);
      if (!pluginStat.isDirectory()) continue;
      const versions = await readdir(pluginDir);
      for (const version of versions) {
        const versionDir = join(pluginDir, version);
        const agentsDir = join(versionDir, 'agents');
        if (!await fileExists(agentsDir)) continue;
        const agentFiles = await readdir(agentsDir);
        for (const agentFile of agentFiles) {
          if (!agentFile.endsWith('.md')) continue;
          const content = await readFile(join(agentsDir, agentFile), 'utf-8');
          const fm = parseFrontmatter(content);
          agents.push({
            name: fm.name || agentFile.replace('.md', ''),
            plugin: pluginName,
            description: fm.description || '',
            model: fm.model || '',
          });
        }
      }
    }
  }
  return agents;
}

async function scanMcpServers() {
  const servers = [];
  const mcpConfig = await readJson(MCP_JSON);
  if (mcpConfig?.mcpServers) {
    for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
      servers.push({
        name,
        command: config.command || '',
        args: config.args || [],
      });
    }
  }
  return servers;
}

async function scanMarketplaces() {
  const marketplaces = [];
  const mpDir = join(CLAUDE_DIR, 'plugins', 'marketplaces');
  if (!await fileExists(mpDir)) return marketplaces;

  const dirs = await readdir(mpDir);
  for (const dir of dirs) {
    const dirPath = join(mpDir, dir);
    const dStat = await stat(dirPath);
    if (!dStat.isDirectory()) continue;
    const pkgJson = await readJson(join(dirPath, 'package.json'));
    marketplaces.push({
      name: pkgJson?.name || dir,
      description: pkgJson?.description || '',
    });
  }
  return marketplaces;
}

async function main() {
  const [plugins, skills, agents, mcpServers, marketplaces] = await Promise.all([
    scanPlugins(),
    scanSkills(),
    scanAgents(),
    scanMcpServers(),
    scanMarketplaces(),
  ]);

  const usagePath = join(import.meta.dirname, '..', 'usage.json');
  const usage = await readJson(usagePath) || { lastUpdated: null, tools: {} };

  const data = {
    generatedAt: new Date().toISOString(),
    plugins,
    skills,
    agents,
    mcpServers,
    marketplaces,
    usage,
  };

  await writeFile(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`Scan complete. Written to ${OUTPUT}`);
  console.log(`  Plugins: ${plugins.length}`);
  console.log(`  Skills: ${skills.length}`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  MCP Servers: ${mcpServers.length}`);
  console.log(`  Marketplaces: ${marketplaces.length}`);
}

main().catch(console.error);
