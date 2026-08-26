/* ============================================
   VendIX - Relatórios (Informes)
   ============================================ */

async function renderRelatorios() {
    const now = new Date();
    const mesAtual = now.getMonth(); // 0-based
    const anoAtual = now.getFullYear();

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h2 style="font-size: 18px; font-weight: 700;">📊 Relatórios</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                Veja como está indo seu negócio
            </p>
        </div>

        <!-- Period selector -->
        <div class="card" style="display: flex; gap: 10px; align-items: center;">
            <select class="form-input" id="rel-mes" style="flex:1;" onchange="atualizarRelatorios()">
                ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => 
                    `<option value="${i}" ${i === mesAtual ? 'selected' : ''}>${m}</option>`
                ).join('')}
            </select>
            <select class="form-input" id="rel-ano" style="width: 100px;" onchange="atualizarRelatorios()">
                ${[anoAtual-1, anoAtual, anoAtual+1].map(a => 
                    `<option value="${a}" ${a === anoAtual ? 'selected' : ''}>${a}</option>`
                ).join('')}
            </select>
        </div>

        <div id="relatorios-content"></div>

        <!-- Spacer -->
        <div style="height: 40px;"></div>
    `;

    await atualizarRelatorios();
}

async function atualizarRelatorios() {
    const mes = parseInt(document.getElementById('rel-mes').value);
    const ano = parseInt(document.getElementById('rel-ano').value);
    const container = document.getElementById('relatorios-content');

    // Get data for selected month
    const dados = await calcularDadosMes(mes, ano);
    // Get data for previous month (comparison)
    const mesPrev = mes === 0 ? 11 : mes - 1;
    const anoPrev = mes === 0 ? ano - 1 : ano;
    const dadosPrev = await calcularDadosMes(mesPrev, anoPrev);

    // Get weekly data
    const dadosSemana = await calcularDadosSemana();

    // Debt aging
    const dividas = await calcularDividas();

    // Top products
    const topProdutos = await calcularTopProdutos(mes, ano);

    const nomesMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    container.innerHTML = `
        <!-- RESUMO DO MÊS -->
        <div class="section-title">📅 Resumo de ${nomesMes[mes]} ${ano}</div>
        
        <div class="summary-grid">
            <div class="summary-card green">
                <div class="icon">💰</div>
                <div class="number">${formatMoney(dados.totalRecebido)}</div>
                <div class="label">Recebido</div>
            </div>
            <div class="summary-card blue">
                <div class="icon">🛒</div>
                <div class="number">${dados.numVendas}</div>
                <div class="label">Vendas</div>
            </div>
            <div class="summary-card orange">
                <div class="icon">📦</div>
                <div class="number">${formatMoney(dados.totalVendido)}</div>
                <div class="label">Total Vendido</div>
            </div>
            <div class="summary-card green">
                <div class="icon">📈</div>
                <div class="number">${formatMoney(dados.lucroEstimado)}</div>
                <div class="label">Lucro Líquido</div>
            </div>
        </div>

        <!-- Profit breakdown -->
        <div class="card" style="margin-bottom: 16px; border-left: 4px solid var(--accent);">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--accent);">💰 Resultado do Mês</div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Total Vendido</span>
                <span style="font-weight: 700; color: var(--accent);">+ ${formatMoney(dados.totalVendido)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Custo dos Produtos</span>
                <span style="font-weight: 700; color: var(--danger);">- ${formatMoney(dados.custoTotal)}</span>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 15px;">
                <span style="font-weight: 800;">Lucro Líquido</span>
                <span style="font-weight: 800; color: ${dados.lucroEstimado >= 0 ? 'var(--accent)' : 'var(--danger)'};">${formatMoney(dados.lucroEstimado)}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                Margem: ${dados.totalVendido > 0 ? Math.round((dados.lucroEstimado / dados.totalVendido) * 100) : 0}%
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Ticket Médio</span>
                <span style="font-weight: 700;">${formatMoney(dados.ticketMedio)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Clientes Atendidos</span>
                <span style="font-weight: 700;">${dados.clientesAtendidos}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: var(--text-secondary);">Pagamentos: Pix / Dinheiro</span>
                <span style="font-weight: 700;">${dados.pix} / ${dados.dinheiro}</span>
            </div>
        </div>

        <!-- COMPARATIVO -->
        <div class="section-title">📊 Comparativo com ${nomesMes[mesPrev]}</div>
        <div class="card">
            ${renderComparativo('Recebido', dados.totalRecebido, dadosPrev.totalRecebido)}
            ${renderComparativo('Vendas', dados.numVendas, dadosPrev.numVendas)}
            ${renderComparativo('Lucro', dados.lucroEstimado, dadosPrev.lucroEstimado)}
        </div>

        <!-- RECEBIMENTOS DA SEMANA -->
        <div class="section-title">📆 Esta Semana</div>
        <div class="card">
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 24px; font-weight: 800; color: var(--accent);">${formatMoney(dadosSemana.total)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">recebido nos últimos 7 dias</div>
            </div>
            <div style="display: flex; justify-content: space-around; gap: 4px;">
                ${dadosSemana.porDia.map(d => `
                    <div style="text-align: center; flex: 1;">
                        <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                            <div style="width: 100%; max-width: 24px; background: ${d.valor > 0 ? 'var(--accent)' : 'var(--border)'}; border-radius: 4px 4px 0 0; height: ${d.valor > 0 ? Math.max(8, (d.valor / Math.max(...dadosSemana.porDia.map(x=>x.valor), 1)) * 60) : 4}px;"></div>
                        </div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${d.dia}</div>
                        <div style="font-size: 10px; font-weight: 600; color: ${d.valor > 0 ? 'var(--text)' : 'var(--text-muted)'};">${d.valor > 0 ? formatMoney(d.valor).replace('R$ ','') : '-'}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- DÍVIDAS -->
        <div class="section-title">💳 Dívidas Pendentes</div>
        <div class="card">
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 22px; font-weight: 800; color: var(--warning);">${formatMoney(dividas.total)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">total a receber</div>
            </div>
            
            <div style="font-size: 13px; margin-bottom: 8px; font-weight: 600;">Por tempo de atraso:</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--border);">
                <span>🟢 Em dia</span>
                <span style="font-weight: 700;">${formatMoney(dividas.emDia)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--border);">
                <span>🟡 1-7 dias atraso</span>
                <span style="font-weight: 700; color: var(--warning);">${formatMoney(dividas.ate7)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--border);">
                <span>🟠 8-15 dias</span>
                <span style="font-weight: 700; color: var(--warning);">${formatMoney(dividas.ate15)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--border);">
                <span>🔴 16-30 dias</span>
                <span style="font-weight: 700; color: var(--danger);">${formatMoney(dividas.ate30)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0;">
                <span>⚫ +30 dias</span>
                <span style="font-weight: 700; color: var(--danger);">${formatMoney(dividas.mais30)}</span>
            </div>
        </div>

        <!-- TOP CLIENTES DEVEDORES -->
        ${dividas.topDevedores.length > 0 ? `
            <div class="section-title">👤 Top Devedores</div>
            <div class="card">
                ${dividas.topDevedores.slice(0, 5).map((d, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; ${i < dividas.topDevedores.length - 1 ? 'border-bottom: 1px solid var(--border);' : ''}">
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${i+1}. ${d.nome}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${d.parcelas} parcela${d.parcelas > 1 ? 's' : ''} pendente${d.parcelas > 1 ? 's' : ''}</div>
                        </div>
                        <div style="font-weight: 700; color: var(--danger);">${formatMoney(d.valor)}</div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <!-- TOP PRODUTOS -->
        ${topProdutos.length > 0 ? `
            <div class="section-title">🏆 Produtos Mais Vendidos (${nomesMes[mes]})</div>
            <div class="card">
                ${topProdutos.slice(0, 5).map((p, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; ${i < topProdutos.length - 1 ? 'border-bottom: 1px solid var(--border);' : ''}">
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${i+1}. ${p.nome}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${p.quantidade}x vendido</div>
                        </div>
                        <div style="font-weight: 700; color: var(--accent);">${formatMoney(p.receita)}</div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

// Calculate month data
async function calcularDadosMes(mes, ano) {
    const inicioMes = new Date(ano, mes, 1).toISOString().split('T')[0];
    const fimMes = new Date(ano, mes + 1, 0).toISOString().split('T')[0];

    // Pagamentos do mês
    const todosPagamentos = await db.pagamentos.toArray();
    const pagMes = todosPagamentos.filter(p => {
        const d = p.data.split('T')[0];
        return d >= inicioMes && d <= fimMes;
    });

    const totalRecebido = pagMes.reduce((s, p) => s + p.valor, 0);
    const pix = pagMes.filter(p => p.forma === 'pix').length;
    const dinheiro = pagMes.filter(p => p.forma === 'dinheiro').length;

    // Vendas do mês
    const todasVendas = await db.vendas.toArray();
    const vendasMes = todasVendas.filter(v => v.data >= inicioMes && v.data <= fimMes && v.status !== 'cancelada');
    const totalVendido = vendasMes.reduce((s, v) => s + v.valorTotal, 0);
    const numVendas = vendasMes.length;

    // Lucro estimado (receita - custo)
    let custoTotal = 0;
    for (const v of vendasMes) {
        if (v.itens && v.itens.length > 0) {
            for (const item of v.itens) {
                const prod = await db.produtos.get(item.produtoId);
                if (prod) custoTotal += (prod.precoCompra || 0) * (item.quantidade || 1);
            }
        }
    }
    const lucroEstimado = totalVendido - custoTotal;

    // Clientes atendidos
    const clientesIds = [...new Set(vendasMes.map(v => v.clienteId))];

    // Ticket médio
    const ticketMedio = numVendas > 0 ? totalVendido / numVendas : 0;

    return { totalRecebido, totalVendido, numVendas, lucroEstimado, custoTotal, ticketMedio, clientesAtendidos: clientesIds.length, pix, dinheiro };
}

// Calculate weekly data
async function calcularDadosSemana() {
    const hoje = new Date();
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const porDia = [];

    const todosPagamentos = await db.pagamentos.toArray();

    for (let i = 6; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(dia.getDate() - i);
        const diaStr = dia.toISOString().split('T')[0];
        const pagDia = todosPagamentos.filter(p => p.data.split('T')[0] === diaStr);
        porDia.push({
            dia: diasSemana[dia.getDay()],
            valor: pagDia.reduce((s, p) => s + p.valor, 0)
        });
    }

    const total = porDia.reduce((s, d) => s + d.valor, 0);
    return { total, porDia };
}

// Calculate debt aging
async function calcularDividas() {
    const hoje = new Date();
    const hojeStr = getToday();
    const pendentes = await db.parcelas.where('status').anyOf(['pendente', 'atrasado']).toArray();

    let emDia = 0, ate7 = 0, ate15 = 0, ate30 = 0, mais30 = 0;

    for (const p of pendentes) {
        const diasAtraso = Math.floor((hoje - new Date(p.dataVencimento + 'T00:00:00')) / (1000*60*60*24));
        if (diasAtraso <= 0) emDia += p.valor;
        else if (diasAtraso <= 7) ate7 += p.valor;
        else if (diasAtraso <= 15) ate15 += p.valor;
        else if (diasAtraso <= 30) ate30 += p.valor;
        else mais30 += p.valor;
    }

    const total = pendentes.reduce((s, p) => s + p.valor, 0);

    // Top devedores
    const byCliente = {};
    for (const p of pendentes) {
        if (!byCliente[p.clienteId]) byCliente[p.clienteId] = { valor: 0, parcelas: 0 };
        byCliente[p.clienteId].valor += p.valor;
        byCliente[p.clienteId].parcelas++;
    }

    const topDevedores = [];
    for (const [clienteId, data] of Object.entries(byCliente)) {
        const cliente = await getCliente(parseInt(clienteId));
        topDevedores.push({ nome: cliente ? cliente.nome : 'Cliente', ...data });
    }
    topDevedores.sort((a, b) => b.valor - a.valor);

    return { total, emDia, ate7, ate15, ate30, mais30, topDevedores };
}

// Top products
async function calcularTopProdutos(mes, ano) {
    const inicioMes = new Date(ano, mes, 1).toISOString().split('T')[0];
    const fimMes = new Date(ano, mes + 1, 0).toISOString().split('T')[0];

    const todasVendas = await db.vendas.toArray();
    const vendasMes = todasVendas.filter(v => v.data >= inicioMes && v.data <= fimMes && v.status !== 'cancelada');

    const produtos = {};
    for (const v of vendasMes) {
        if (v.itens && v.itens.length > 0) {
            for (const item of v.itens) {
                if (!produtos[item.produtoId]) {
                    const prod = await db.produtos.get(item.produtoId);
                    produtos[item.produtoId] = { nome: prod ? prod.nome : 'Produto', quantidade: 0, receita: 0 };
                }
                produtos[item.produtoId].quantidade += (item.quantidade || 1);
                produtos[item.produtoId].receita += v.valorTotal;
            }
        }
    }

    return Object.values(produtos).sort((a, b) => b.quantidade - a.quantidade);
}

// Render comparison row
function renderComparativo(label, atual, anterior) {
    const diff = anterior > 0 ? ((atual - anterior) / anterior) * 100 : (atual > 0 ? 100 : 0);
    const isUp = diff >= 0;
    const arrow = isUp ? '↑' : '↓';
    const color = isUp ? 'var(--accent)' : 'var(--danger)';

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <div style="font-size: 13px; color: var(--text-secondary);">${label}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700;">${typeof atual === 'number' && atual > 100 ? formatMoney(atual) : atual}</span>
                <span style="font-size: 12px; font-weight: 700; color: ${color};">${arrow} ${Math.abs(diff).toFixed(0)}%</span>
            </div>
        </div>
    `;
}
