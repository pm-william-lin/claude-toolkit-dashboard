const SKILL_FLOWS = [
  ['brainstorming', 'writing-plans'],
  ['writing-plans', 'executing-plans'],
  ['writing-plans', 'subagent-driven-development'],
  ['requesting-code-review', 'code-reviewer'],
  ['receiving-code-review', 'code-reviewer'],
  ['using-git-worktrees', 'brainstorming'],
  ['systematic-debugging', 'verification-before-completion'],
  ['test-driven-development', 'verification-before-completion'],
];

const NODE_COLORS = {
  plugin: '#d97706',
  skill: '#0891b2',
  agent: '#7c3aed',
  mcpServer: '#059669',
};

export function renderGraph(data) {
  const container = document.getElementById('graph');
  const width = container.clientWidth;
  const height = container.clientHeight || 500;

  const nodes = [];
  const links = [];
  const nodeSet = new Set();

  function addNode(id, type, label) {
    if (nodeSet.has(id)) return;
    nodeSet.add(id);
    nodes.push({ id, type, label });
  }

  data.plugins.forEach(p => addNode('plugin:' + p.name, 'plugin', p.name));

  data.skills.forEach(s => {
    addNode('skill:' + s.name, 'skill', s.name);
    // Only link to plugin if scope is 'plugin'
    if (s.scope === 'plugin' && nodeSet.has('plugin:' + s.source)) {
      links.push({ source: 'plugin:' + s.source, target: 'skill:' + s.name, type: 'owns' });
    }
  });

  data.agents.forEach(a => {
    addNode('agent:' + a.name, 'agent', a.name);
    if (a.scope === 'plugin' && nodeSet.has('plugin:' + a.source)) {
      links.push({ source: 'plugin:' + a.source, target: 'agent:' + a.name, type: 'owns' });
    }
  });

  data.mcpServers.forEach(m => addNode('mcp:' + m.name, 'mcpServer', m.name));

  SKILL_FLOWS.forEach(([from, to]) => {
    const sourceId = nodeSet.has('skill:' + from) ? 'skill:' + from : null;
    const targetId = nodeSet.has('skill:' + to) ? 'skill:' + to :
                     nodeSet.has('agent:' + to) ? 'agent:' + to : null;
    if (sourceId && targetId) {
      links.push({ source: sourceId, target: targetId, type: 'triggers' });
    }
  });

  const svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#d97706');

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));

  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', d => d.type === 'triggers' ? '#d97706' : '#d1d5db')
    .attr('stroke-width', d => d.type === 'triggers' ? 2 : 1)
    .attr('stroke-dasharray', d => d.type === 'triggers' ? '5,3' : 'none')
    .attr('marker-end', d => d.type === 'triggers' ? 'url(#arrowhead)' : '');

  const node = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      }));

  node.append('circle')
    .attr('r', d => d.type === 'plugin' ? 14 : 10)
    .attr('fill', d => NODE_COLORS[d.type]);

  node.append('text')
    .text(d => d.label)
    .attr('dx', 16)
    .attr('dy', 4)
    .attr('fill', '#374151')
    .attr('font-size', '11px');

  node.append('title').text(d => d.type + ': ' + d.label);

  const legend = svg.append('g').attr('transform', 'translate(20, 20)');
  const types = Object.entries(NODE_COLORS);
  types.forEach(([type, color], i) => {
    const g = legend.append('g').attr('transform', 'translate(0, ' + (i * 22) + ')');
    g.append('circle').attr('r', 6).attr('fill', color);
    g.append('text').text(type).attr('x', 14).attr('dy', 4)
      .attr('fill', '#6b7280').attr('font-size', '12px');
  });

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
  });
}
