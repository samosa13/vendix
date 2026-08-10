/* ============================================
   VendIX - Dashboard Page
   ============================================ */

async function renderDashboard() {
    const stats = await getStats();
    const parcelasHoje = await getParcelasHoje();

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <!-- Summary Cards -->
        <div class="summary-grid">
            <div class="summary-card orange">
                <div class="icon">💲</div>
                <div class="number">${stats.cobranasHoje}</div>
                <div class="label">Cobrar Hoje</div>
            </div>
            <div class="summary-card red">
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
            <button class="btn btn-accent btn-sm" onclick="navigateTo('vendas'); setTimeout(()=>document.getElementById('fab-venda')?.click(), 100)">
                🛒 Nova Venda
            </button>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('cobrancas')">
                💲 Cobrar Agora
            </button>
        </div>

        <!-- Today's collections -->
        ${parcelasHoje.length > 0 ? `
            <div class="section-title">📅 Para Cobrar Hoje</div>
            <div id="dashboard-cobrancas"></div>
        ` : `
            <div class="card" style="text-align: center; padding: 24px;">
                <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
                <div style="font-size: 15px; color: var(--text-secondary);">
                    Nenhuma cobrança para hoje!
                </div>
            </div>
        `}

        <!-- Alerts -->
        ${stats.estoqueBaixo > 0 ? `
            <div class="section-title">📦 Alerta de Estoque</div>
            <div class="card" style="border-left: 4px solid var(--warning);">
                <span style="font-size: 14px;">
                    ⚠️ <strong>${stats.estoqueBaixo} produto${stats.estoqueBaixo > 1 ? 's' : ''}</strong> com estoque baixo
                </span>
                <button class="btn btn-ghost btn-sm mt-8" onclick="navigateTo('produtos')">
                    Ver Produtos
                </button>
            </div>
        ` : ''}

        ${stats.atrasadas > 0 ? `
            <div class="section-title">🚨 Parcelas Atrasadas</div>
            <div class="card" style="border-left: 4px solid var(--danger);">
                <span style="font-size: 14px;">
                    <strong>${stats.atrasadas} parcela${stats.atrasadas > 1 ? 's' : ''}</strong> atrasada${stats.atrasadas > 1 ? 's' : ''}
                    — Total: <strong class="text-danger">${formatMoney(stats.valorAtrasado)}</strong>
                </span>
                <button class="btn btn-ghost btn-sm mt-8" onclick="navigateTo('cobrancas')">
                    Ver Cobranças
                </button>
            </div>
        ` : ''}
    `;

    // Render today's cobrancas
    if (parcelasHoje.length > 0) {
        const container = document.getElementById('dashboard-cobrancas');
        for (const parcela of parcelasHoje.slice(0, 5)) {
            const cliente = await getCliente(parcela.clienteId);
            const isAtrasado = parcela.dataVencimento < getToday();
            container.innerHTML += `
                <div class="cobranca-card ${isAtrasado ? 'atrasado' : ''}">
                    <div class="cliente-nome">${cliente ? cliente.nome : 'Cliente'}</div>
                    <div class="cobranca-valor">${formatMoney(parcela.valor)}</div>
                    <div class="cobranca-info">
                        Parcela ${parcela.numero} • Vencimento: ${formatDate(parcela.dataVencimento)}
                        ${isAtrasado ? ' • <span class="text-danger">ATRASADA</span>' : ''}
                    </div>
                    <div class="action-row">
                        <button class="btn btn-accent btn-sm" onclick="pagarParcela(${parcela.id}, 'pix')">
                            ✅ Recebido Pix
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="pagarParcela(${parcela.id}, 'dinheiro')">
                            💵 Recebido Dinheiro
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

async function pagarParcela(parcelaId, forma) {
    await marcarParcelaPaga(parcelaId, forma);
    showToast('✅ Pagamento registrado!');
    renderDashboard();
}
