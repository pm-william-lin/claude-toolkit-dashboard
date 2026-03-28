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
    bundled: 'scope-bundled',
    plugin: 'scope-plugin',
    personal: 'scope-personal',
    project: 'scope-project',
  };
  return '<span class="scope-badge ' + (colors[scope] || '') + '">' + scope + '</span>';
}

function renderCard(item) {
  return '<div class="item-card">' +
    '<div class="flex items-center justify-between">' +
      '<h3>' + item.title + '</h3>' +
      item.badge +
    '</div>' +
    '<div class="meta">' + item.meta + '</div>' +
    (item.desc ? '<div class="desc">' + item.desc + '</div>' : '') +
  '</div>';
}

function renderGroupedByScope(list, mapFn) {
  const scopeOrder = ['bundled', 'plugin', 'personal', 'project'];
  const scopeLabels = {
    bundled: 'Bundled',
    plugin: 'Plugin',
    personal: 'Personal',
    project: 'Project',
  };
  const grouped = {};
  list.forEach(item => {
    const s = item.scope || 'unknown';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(item);
  });

  let html = '';
  for (const scope of scopeOrder) {
    const items = grouped[scope];
    if (!items || items.length === 0) continue;
    html += '<div class="scope-section">' +
      '<div class="scope-header">' +
        '<span class="scope-badge ' + ('scope-' + scope) + '">' + scopeLabels[scope] + '</span>' +
        '<span class="scope-count">' + items.length + '</span>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' +
        items.map(mapFn).map(renderCard).join('') +
      '</div>' +
    '</div>';
  }
  return html;
}

function renderItems(tab) {
  const container = document.getElementById('tabContent');

  if (tab === 'skills') {
    container.className = 'space-y-6';
    container.innerHTML = renderGroupedByScope(appData.skills, s => ({
      title: s.name,
      meta: 'Source: ' + s.source,
      desc: s.description,
      badge: usageBadge(s.name),
    }));
    return;
  }

  if (tab === 'agents') {
    container.className = 'space-y-6';
    container.innerHTML = renderGroupedByScope(appData.agents, a => ({
      title: a.name,
      meta: 'Source: ' + a.source + (a.model ? ' \u00b7 Model: ' + a.model : ''),
      desc: a.description.length > 150 ? a.description.slice(0, 150) + '...' : a.description,
      badge: usageBadge(a.name),
    }));
    return;
  }

  if (tab === 'projects') {
    container.className = 'space-y-6';
    container.innerHTML = renderProjects();
    return;
  }

  // Default grid layout for plugins and mcpServers
  container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
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
    case 'mcpServers':
      items = appData.mcpServers.map(m => ({
        title: m.name,
        meta: m.command + ' ' + m.args.join(' '),
        desc: '',
        badge: usageBadge(m.name),
      }));
      break;
  }

  container.innerHTML = items.map(renderCard).join('');
}

function renderUsageList(label, obj, cssClass) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '';
  return '<div class="project-usage-group">' +
    '<span class="project-usage-label ' + cssClass + '">' + label + '</span>' +
    '<div class="project-usage-items">' +
      entries.map(([name, count]) =>
        '<div class="project-usage-item">' +
          '<span>' + name + '</span>' +
          '<span class="project-usage-count">' + count + '</span>' +
        '</div>'
      ).join('') +
    '</div>' +
  '</div>';
}

function renderProjects() {
  const byProject = appData.usage?.byProject || {};
  const projects = Object.entries(byProject);

  if (projects.length === 0) {
    return '<div class="text-center py-12" style="color: #9ca3af;">' +
      'No project usage data yet. Data will accumulate as you use Skills, Agents, and MCP tools across projects.' +
    '</div>';
  }

  // Sort by total usage descending
  projects.sort((a, b) => {
    const totalA = Object.values(a[1].skills || {}).reduce((s, v) => s + v, 0) +
                   Object.values(a[1].agents || {}).reduce((s, v) => s + v, 0) +
                   Object.values(a[1].mcpTools || {}).reduce((s, v) => s + v, 0);
    const totalB = Object.values(b[1].skills || {}).reduce((s, v) => s + v, 0) +
                   Object.values(b[1].agents || {}).reduce((s, v) => s + v, 0) +
                   Object.values(b[1].mcpTools || {}).reduce((s, v) => s + v, 0);
    return totalB - totalA;
  });

  return projects.map(([name, data]) => {
    const totalSkills = Object.values(data.skills || {}).reduce((s, v) => s + v, 0);
    const totalAgents = Object.values(data.agents || {}).reduce((s, v) => s + v, 0);
    const totalMcp = Object.values(data.mcpTools || {}).reduce((s, v) => s + v, 0);
    const total = totalSkills + totalAgents + totalMcp;

    return '<div class="project-card">' +
      '<div class="project-header">' +
        '<h3 class="project-name">' + name + '</h3>' +
        '<span class="project-total">' + total + ' calls</span>' +
      '</div>' +
      '<div class="project-stats">' +
        (totalSkills ? '<span class="project-stat scope-plugin">Skills: ' + totalSkills + '</span>' : '') +
        (totalAgents ? '<span class="project-stat scope-project">Agents: ' + totalAgents + '</span>' : '') +
        (totalMcp ? '<span class="project-stat scope-global">MCP: ' + totalMcp + '</span>' : '') +
      '</div>' +
      '<div class="project-details">' +
        renderUsageList('Skills', data.skills, 'scope-plugin') +
        renderUsageList('Agents', data.agents, 'scope-project') +
        renderUsageList('MCP Tools', data.mcpTools, 'scope-global') +
      '</div>' +
    '</div>';
  }).join('');
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
