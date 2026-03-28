export function renderUsageChart(data) {
  const canvas = document.getElementById('usageChart');
  const noMsg = document.getElementById('noUsageMsg');
  const tools = data.usage?.tools || {};
  const entries = Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (entries.length === 0) {
    canvas.style.display = 'none';
    noMsg.classList.remove('hidden');
    return;
  }

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{
        label: 'Usage Count',
        data: entries.map(e => e[1]),
        backgroundColor: 'rgba(217, 119, 6, 0.25)',
        borderColor: 'rgba(217, 119, 6, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' } },
        y: { ticks: { color: '#374151', font: { size: 12 } }, grid: { display: false } },
      },
    },
  });
}
