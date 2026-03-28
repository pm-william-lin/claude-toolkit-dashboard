import { renderUsageChart } from './charts.js';
import { renderGraph } from './graph.js';

let appData = null;

async function loadData() {
  const res = await fetch('data.json');
  appData = await res.json();
  return appData;
}

function renderSummary(data) {
  const container = document.getElementById('summary');
  const cards = [
    { label: 'Plugins', count: data.plugins.length },
    { label: 'Skills', count: data.skills.length },
    { label: 'Agents', count: data.agents.length },
    { label: 'MCP Servers', count: data.mcpServers.length },
  ];
  container.innerHTML = cards.map(c => `
    <div class="summary-card">
      <div class="count">${c.count}</div>
      <div class="label">${c.label}</div>
    </div>
  `).join('');

  const scanEl = document.getElementById('lastScan');
  const date = new Date(data.generatedAt);
  scanEl.textContent = 'Last scan: ' + date.toLocaleString('zh-TW');
}

function getUsageCount(name) {
  if (!appData?.usage?.tools) return 0;
  return appData.usage.tools[name] || 0;
}

function usageBadge(name) {
  const count = getUsageCount(name);
  const cls = count > 0 ? 'usage-badge used' : 'usage-badge';
  return '<span class="' + cls + '">' + count + ' uses</span>';
}

function scopeBadge(scope) {
  const colors = {
    plugin: 'scope-plugin',
    global: 'scope-global',
    project: 'scope-project',
  };
  return '<span class="scope-badge ' + (colors[scope] || '') + '">' + scope + '</span>';
}

function renderItems(tab) {
  const container = document.getElementById('tabContent');
  let items = [];

  switch (tab) {
    case 'plugins':
      items = appData.plugins.map(p => ({
        title: p.name,
        meta: 'v' + p.version + ' \u00b7 ' + p.source,
        desc: p.description,
        badge: usageBadge(p.name),
      }));
      break;
    case 'skills':
      items = appData.skills.map(s => ({
        title: s.name,
        meta: 'Source: ' + s.source,
        desc: s.description,
        badge: scopeBadge(s.scope) + ' ' + usageBadge(s.name),
      }));
      break;
    case 'agents':
      items = appData.agents.map(a => ({
        title: a.name,
        meta: 'Source: ' + a.source + (a.model ? ' \u00b7 Model: ' + a.model : ''),
        desc: a.description.length > 150 ? a.description.slice(0, 150) + '...' : a.description,
        badge: scopeBadge(a.scope) + ' ' + usageBadge(a.name),
      }));
      break;
    case 'mcpServers':
      items = appData.mcpServers.map(m => ({
        title: m.name,
        meta: m.command + ' ' + m.args.join(' '),
        desc: '',
        badge: usageBadge(m.name),
      }));
      break;
  }

  container.innerHTML = items.map(item =>
    '<div class="item-card">' +
      '<div class="flex items-center justify-between">' +
        '<h3>' + item.title + '</h3>' +
        item.badge +
      '</div>' +
      '<div class="meta">' + item.meta + '</div>' +
      (item.desc ? '<div class="desc">' + item.desc + '</div>' : '') +
    '</div>'
  ).join('');
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderItems(btn.dataset.tab);
    });
  });
}

async function init() {
  const data = await loadData();
  renderSummary(data);
  setupTabs();
  renderItems('plugins');
  renderUsageChart(data);
  renderGraph(data);
}

init();
