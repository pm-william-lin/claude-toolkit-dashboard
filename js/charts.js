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
        backgroundColor: 'rgba(233, 69, 96, 0.6)',
        borderColor: 'rgba(233, 69, 96, 1)',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8892a4' }, grid: { color: '#2a2a4a' } },
        y: { ticks: { color: '#eaeaea', font: { size: 12 } }, grid: { display: false } },
      },
    },
  });
}
