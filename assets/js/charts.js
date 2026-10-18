import { data } from './demo-data.js';
import { esc } from './ui.js';
const instances = [];
export function chartPanel(id, title, description, period = true) {
    return `<section class="glass panel"><div class="panel-heading"><div><h2>${title}</h2><p>${description}</p></div>${period ? `<select class="chart-period" data-chart="${id}" aria-label="Chart period" style="width:auto;font-size:10px;min-height:30px;padding:5px 9px"><option value="week">This week</option><option value="previous">Previous week</option></select>` : ''}</div><div class="chart-legend"><span><i class="dot"></i>Sample ${title.toLowerCase()}</span></div><div class="chart-wrap"><canvas id="${id}" role="img" aria-label="${title}: sample data"></canvas><div id="${id}-fallback" hidden></div></div></section>`;
}
function draw(canvas, values, labels, type) {
    canvas.setAttribute('aria-label', 'Sample chart: ' + labels.map((label, i) => `${label}: ${values[i]}`).join(', '));
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(), accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    if (!window.Chart) {
        canvas.hidden = true;
        const fallback = document.getElementById(canvas.id + '-fallback');
        fallback.hidden = false;
        fallback.style.height = '100%';
        fallback.innerHTML = `<div class="fallback-bars" role="img" aria-label="Sample chart: ${labels.map((l, i) => `${l} ${values[i]}`).join(', ')}">${values.map((v, i) => `<div class="fallback-bar" style="height:${Math.max(5, v / Math.max(...values) * 80)}%"><b>${v}</b><span>${esc(labels[i])}</span></div>`).join('')}</div>`;
        return;
    }
    canvas.hidden = false;
    document.getElementById(canvas.id + '-fallback').hidden = true;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, accent + '38');
    gradient.addColorStop(1, accent + '00');
    const chart = new Chart(context, {
        type, data: {
            labels, datasets: [{
                    label: 'Sample value', data: values, borderColor: accent, backgroundColor: type === 'doughnut' ? ['#8d8cff', '#46d7e9', '#efc173', '#fa8394'] : type === 'bar' ? accent : gradient, borderWidth: 2, fill: true, tension: .42, pointRadius: 3, pointHoverRadius: 6, borderRadius: 5
                }]
        }, options: {
            maintainAspectRatio: false, animation: reduce ? false : {
                duration: 500
            }, plugins: {
                legend: {
                    display: type === 'doughnut', position: 'bottom', labels: {
                        color: muted, boxWidth: 10, font: {
                            size: 10
                        }
                    }
                }
            }, scales: type === 'doughnut' ? {} : {
                x: {
                    grid: {
                        display: false
                    }, ticks: {
                        color: muted, font: {
                            size: 10
                        }
                    }, border: {
                        display: false
                    }
                }, y: {
                    beginAtZero: true, grid: {
                        color: '#93a1bd0c'
                    }, ticks: {
                        color: muted, font: {
                            size: 10
                        }
                    }, border: {
                        display: false
                    }
                }
            }
        }
    });
    instances.push(chart);
}
export function initializeCharts() {
    instances.splice(0).forEach(c => c.destroy());
    document.querySelectorAll('.chart-wrap canvas').forEach(c => {
        const period = document.querySelector(`[data-chart="${c.id}"]`)?.value;
        let values, labels = data.reports.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], type = 'line';
        if (c.id.includes('stock')) {
            values = ['full', 'empty', 'damaged', 'missing'].map(k => data.stock.reduce((s, r) => s + r[k], 0));
            labels = ['Full', 'Empty', 'Damaged', 'Missing'];
            type = 'doughnut';
        }
        else if (c.id.includes('success')) {
            values = ['Delivered', 'Pending', 'Failed', 'In Progress', 'Assigned'].map(s => data.deliveries.filter(d => d.status === s).length);
            labels = ['Done', 'Pending', 'Failed', 'On route', 'Assigned'];
            type = 'bar';
        }
        else if (c.id.includes('payment')) {
            values = data.reports.collections;
            type = 'bar';
        }
        else
            values = data.reports.deliveries;
        if (period === 'previous' && !data.connected)
            values = values.map((v, i) => Math.round(v * (.7 + i * .025)));
        draw(c, values, labels, type);
    });
    document.querySelectorAll('.chart-period').forEach(s => {
        if (data.connected) {
            s.querySelector('option[value="previous"]')?.remove();
            s.options[0].textContent = 'Last 7 days';
            s.disabled = true;
        }
        s.onchange = initializeCharts;
    });
}
document.addEventListener('theme-change', initializeCharts);
document.addEventListener('chart-ready', initializeCharts);
