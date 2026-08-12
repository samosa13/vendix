/* ============================================
   VendIX - Dashboard Page (simplified)
   ============================================ */

async function renderDashboard() {
    const stats = await getStats();

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <!-- Summary Cards (clickable) -->
        <div class="summary-grid">
            <div class="summary-card orange" onclick="navigateTo('cobrancas')" style="cursor:pointer;">
                <div class="icon">💲</div>
                <div class="number">${stats.cobranasHoje}</div>
                <div class="label">Cobrar Hoje</div>
            </div>
            <div class="summary-card red" onclick="navigateTo('cobrancas')" style="cursor:pointer;">
                <div class="icon">⚠️</div>
                <div class="number">${stats.atrasadas}</div>
                <div class="label">Atrasadas</div>
            </div>
            <div class="summary-card green">
                <div class="icon">✅</div>
                <div class="number">${formatMoney(stats.recebidoMes)}</div>
                <div class="label">Recebido no Mês</div>
            </div>
            <div class="summary-card blue">
                <div class="icon">📊</div>
                <div class="number">${formatMoney(stats.totalReceber)}</div>
                <div class="label">Total a Receber</div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="section-title">⚡ Ações Rápidas</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            <button class="btn btn-accent btn-sm" onclick="navigateTo('vendas'); setTimeout(()=>document.querySelector('.fab')?.click(), 100)">
                🛒 Nova Venda
            </button>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('cobrancas')">
                💲 Cobrar Agora
            </button>
        </div>

        <!-- Alerts -->
        ${stats.atrasadas > 0 ? `
            <div class="card" style="border-left: 4px solid var(--danger); cursor: pointer;" onclick="navigateTo('cobrancas')">
                <span style="font-size: 14px;">
                    🚨 <strong>${stats.atrasadas} parcela${stats.atrasadas > 1 ? 's' : ''}</strong> atrasada${stats.atrasadas > 1 ? 's' : ''}
                    — Total: <strong class="text-danger">${formatMoney(stats.valorAtrasado)}</strong>
                </span>
            </div>
        ` : `
            <div class="card" style="border-left: 4px solid var(--accent); text-align: center;">
                <span style="font-size: 14px; color: var(--accent);">🎉 Nenhuma parcela atrasada!</span>
            </div>
        `}
    `;

    // Stock alert badge in header
    updateStockBadge(stats.estoqueBaixo);
}

function updateStockBadge(count) {
    // Remove existing badge
    const existing = document.getElementById('stock-badge');
    if (existing) existing.remove();

    if (count > 0) {
        const header = document.querySelector('.app-header');
        const badge = document.createElement('div');
        badge.id = 'stock-badge';
        badge.style.cssText = 'position:absolute; top:8px; right:48px; background:var(--danger); color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; cursor:pointer; animation: pulse 2s infinite;';
        badge.textContent = count;
        badge.title = count + ' produtos com estoque baixo';
        badge.onclick = () => mostrarEstoqueBaixo();
        header.appendChild(badge);
    }
}

async function mostrarEstoqueBaixo() {
    navigateTo('produtos');
}

async function pagarParcela(parcelaId, forma) {
    await marcarParcelaPaga(parcelaId, forma);
    showToast('✅ Pagamento registrado!');
    renderDashboard();
}
