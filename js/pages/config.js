/* ============================================
   VendIX - Configurações Page
   ============================================ */

// Default config values
const CONFIG_DEFAULTS = {
    nomeNegocio: 'VendIX',
    dddPadrao: '49',
    jurosPadrao: 0,
    parcelasPadrao: 4,
    estoqueMinimoAlerta: 2,
    mensagemWhatsApp: 'Oi {nome}! Passando para lembrar das parcelas pendentes. Posso passar aí hoje?',
    moeda: 'R$',
    horaBackup: '23:59',
    frequenciaBackup: 'diario',
    autoBackup: true,
    mostrarRotaMaps: true,
    agruparVendasCliente: false
};

// Load config from localStorage
function getConfig() {
    const saved = localStorage.getItem('vendix_config');
    if (saved) {
        return { ...CONFIG_DEFAULTS, ...JSON.parse(saved) };
    }
    return { ...CONFIG_DEFAULTS };
}

// Save config
function saveConfig(config) {
    localStorage.setItem('vendix_config', JSON.stringify(config));
}

// Get a single config value
function configVal(key) {
    const config = getConfig();
    return config[key] !== undefined ? config[key] : CONFIG_DEFAULTS[key];
}

// Render config page
function renderConfig() {
    const config = getConfig();
    const lastBackup = localStorage.getItem('vendix_last_backup');
    const lastBackupText = lastBackup
        ? `✅ Último backup: ${formatDate(lastBackup.split('T')[0])}`
        : '⚠️ Você nunca fez backup!';
    const lastBackupColor = lastBackup ? 'var(--accent)' : 'var(--danger)';

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700;">⚙️ Configurações</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                Ajuste o app do seu jeito
            </p>
        </div>

        <!-- Negócio -->
        <div class="card">
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">📋 Nome do Negócio</label>
                <input type="text" class="form-input" id="cfg-nome" value="${config.nomeNegocio}" placeholder="Ex: Alencar Vendas">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Aparece no topo do app
                </div>
            </div>
        </div>

        <!-- Telefone -->
        <div class="card">
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">📱 DDD Padrão</label>
                <input type="text" class="form-input" id="cfg-ddd" value="${config.dddPadrao}" placeholder="Ex: 62" maxlength="2" inputmode="numeric">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Preenche automático ao cadastrar cliente (deixe vazio se não quiser)
                </div>
            </div>
        </div>

        <!-- Vendas -->
        <div class="section-title">🛒 Vendas</div>

        <div class="card">
            <div class="form-group">
                <label class="form-label">💰 Taxa de Juros Padrão (% ao mês)</label>
                <input type="number" step="0.1" class="form-input" id="cfg-juros" value="${config.jurosPadrao}" placeholder="0" inputmode="decimal">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Já vem preenchido ao criar venda (pode mudar na hora)
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">📊 Número de Parcelas Padrão</label>
                <select class="form-input" id="cfg-parcelas">
                    ${[2,3,4,5,6,8,10,12].map(n => `<option value="${n}" ${n === config.parcelasPadrao ? 'selected' : ''}>${n}x</option>`).join('')}
                </select>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Já vem selecionado ao criar venda (pode mudar na hora)
                </div>
            </div>
        </div>

        <!-- Estoque -->
        <div class="section-title">📦 Estoque</div>

        <div class="card">
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">⚠️ Alerta de Estoque Baixo</label>
                <input type="number" class="form-input" id="cfg-estoque-min" value="${config.estoqueMinimoAlerta}" placeholder="2" inputmode="numeric">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Avisa quando um produto tem essa quantidade ou menos
                </div>
            </div>
        </div>

        <!-- WhatsApp -->
        <div class="section-title">📲 WhatsApp</div>

        <div class="card">
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">💬 Mensagem de Cobrança</label>
                <textarea class="form-input" id="cfg-whatsapp" rows="3" placeholder="Mensagem automática...">${config.mensagemWhatsApp}</textarea>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Use <strong>{nome}</strong> para incluir o nome do cliente automaticamente
                </div>
            </div>
        </div>

        <!-- Google Maps -->
        <div class="section-title">🗺️ Google Maps</div>

        <div class="card">
            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                    <div style="font-weight: 600; font-size: 14px;">Mostrar rota no mapa</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Mostra botão "Abrir Rota" na tela de Cobranças
                    </div>
                </div>
                <input type="checkbox" id="cfg-maps" ${config.mostrarRotaMaps !== false ? 'checked' : ''} style="width: 22px; height: 22px;">
            </label>
        </div>

        <!-- Agrupar vendas -->
        <div class="card" style="margin-top: 8px;">
            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                    <div style="font-weight: 600; font-size: 14px;">Agrupar vendas por cliente</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Mostra 1 ficha por cliente com todas as vendas ativas
                    </div>
                </div>
                <input type="checkbox" id="cfg-agrupar" ${config.agruparVendasCliente ? 'checked' : ''} style="width: 22px; height: 22px;">
            </label>
        </div>

        <!-- Backup -->
        <div class="section-title">💾 Backup dos Dados</div>

        <div class="card">
            <div class="form-group">
                <label class="form-label">🔄 Frequência do Lembrete</label>
                <select class="form-input" id="cfg-freq-backup">
                    <option value="diario" ${(config.frequenciaBackup || 'diario') === 'diario' ? 'selected' : ''}>Todo dia</option>
                    <option value="2dias" ${config.frequenciaBackup === '2dias' ? 'selected' : ''}>A cada 2 dias</option>
                    <option value="semanal" ${config.frequenciaBackup === 'semanal' ? 'selected' : ''}>Uma vez por semana</option>
                </select>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Com que frequência o app lembra de fazer backup
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">⏰ Hora do Lembrete</label>
                <input type="time" class="form-input" id="cfg-hora-backup" value="${config.horaBackup || '20:00'}">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    O app lembra depois dessa hora (na próxima vez que abrir)
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button type="button" class="btn btn-accent btn-sm" onclick="exportarBackup()" style="flex:1;">
                    📥 Fazer Backup
                </button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="abrirRestoreFile()" style="flex:1;">
                    📤 Restaurar
                </button>
            </div>

            <div style="font-size: 12px; color: ${lastBackupColor}; text-align: center; margin-bottom: 6px;">
                ${lastBackupText}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); text-align: center;">
                Ao tocar "Fazer Backup", abre o menu para enviar por WhatsApp, Google Drive ou salvar no celular.
            </div>
        </div>

        <!-- Save button -->
        <button class="btn btn-accent mt-24" onclick="salvarConfig()">
            ✅ Salvar Configurações
        </button>

        <!-- Archive data -->
        <div class="section-title mt-24">📦 Arquivar Dados</div>
        <div class="card">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                Arquiva vendas finalizadas (quitadas, canceladas, incompletas) de um ano específico. Os dados saem das listas mas podem ser consultados e restaurados.
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="abrirArquivar()">
                📦 Arquivar por Ano
            </button>
            <button type="button" class="btn btn-ghost btn-sm mt-8" onclick="abrirArquivo()">
                📂 Ver Arquivo
            </button>
        </div>

        <!-- Reset data -->
        <div class="section-title mt-24">🗑️ Limpar Dados</div>
        <div class="card">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                Apaga TODOS os dados do app (produtos, clientes, vendas, parcelas). Use para começar do zero.
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="confirmarLimparDados()">
                🗑️ Apagar Tudo e Começar do Zero
            </button>
        </div>

        <!-- Logout -->
        <div class="section-title mt-24">🔒 Segurança</div>
        <div class="card">
            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label">Tempo de sessão (minutos)</label>
                <input type="number" class="form-input" id="cfg-session-timeout" value="${parseInt(localStorage.getItem('vendix_session_timeout')) || 15}" min="1" max="480" style="width: 100px;">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Depois deste tempo sem usar o app, pede senha de novo.
                </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="doLogout()">
                🔒 Sair / Bloquear App
            </button>
        </div>

        <!-- Spacer for nav -->
        <div style="height: 40px;"></div>
    `;
}

function salvarConfig() {
    const config = {
        nomeNegocio: document.getElementById('cfg-nome').value.trim() || CONFIG_DEFAULTS.nomeNegocio,
        dddPadrao: document.getElementById('cfg-ddd').value.trim(),
        jurosPadrao: parseFloat(document.getElementById('cfg-juros').value) || 0,
        parcelasPadrao: parseInt(document.getElementById('cfg-parcelas').value) || 4,
        estoqueMinimoAlerta: parseInt(document.getElementById('cfg-estoque-min').value) || 2,
        mensagemWhatsApp: document.getElementById('cfg-whatsapp').value.trim() || CONFIG_DEFAULTS.mensagemWhatsApp,
        horaBackup: document.getElementById('cfg-hora-backup').value || '23:59',
        frequenciaBackup: document.getElementById('cfg-freq-backup').value || 'diario',
        mostrarRotaMaps: document.getElementById('cfg-maps').checked,
        agruparVendasCliente: document.getElementById('cfg-agrupar').checked,
        autoBackup: true,
        moeda: 'R$'
    };

    saveConfig(config);

    // Save session timeout separately (not part of app config, it's auth)
    const timeout = parseInt(document.getElementById('cfg-session-timeout')?.value) || 15;
    localStorage.setItem('vendix_session_timeout', timeout.toString());

    document.getElementById('page-title').textContent = config.nomeNegocio;
    showToast('✅ Configurações salvas!');
}


// Reset all data
function confirmarLimparDados() {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">🗑️ Apagar Tudo</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="padding: 16px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
            <p style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--danger);">
                ATENÇÃO!
            </p>
            <p style="font-size: 14px; color: var(--text-secondary);">
                Isso vai apagar TODOS os dados:<br>
                produtos, clientes, vendas, parcelas e pagamentos.
            </p>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">
                As configurações serão mantidas.<br>
                Faça um backup antes se quiser guardar os dados!
            </p>
        </div>
        <div class="confirm-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="executarLimparDados()">Apagar Tudo</button>
        </div>
    `);
}

async function executarLimparDados() {
    // Delete and recreate DB to reset auto-increment IDs
    await db.delete();
    await db.open();
    localStorage.removeItem('vendix_last_backup');
    localStorage.removeItem('vendix_first_use');
    closeModal();
    showToast('🗑️ Dados apagados!');

    // Ask if wants demo data
    setTimeout(() => {
        openModal(`
            <div class="modal-header">
                <h2 class="modal-title">🎉 Tudo limpo!</h2>
                <button class="modal-close" onclick="closeModal(); navigateTo('dashboard');">✕</button>
            </div>
            <div style="padding: 16px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">📦</div>
                <p style="font-size: 15px; margin-bottom: 8px;">
                    Quer carregar dados de exemplo para testar o app?
                </p>
                <p style="font-size: 13px; color: var(--text-secondary);">
                    São produtos, clientes e vendas fictícias para você explorar como funciona.
                </p>
            </div>
            <div class="confirm-actions">
                <button class="btn btn-ghost" onclick="closeModal(); navigateTo('dashboard');">Não, começar vazio</button>
                <button class="btn btn-accent" onclick="carregarDemoENavegar()">Sim, carregar exemplos</button>
            </div>
        `);
    }, 300);
}

async function carregarDemoENavegar() {
    closeModal();
    await carregarDadosDemo();
    showToast('✅ Dados de exemplo carregados!');
    navigateTo('dashboard');
}


// ============ ARQUIVO (Archive) ============

async function abrirArquivar() {
    // Find years that have archivable vendas (quitada, cancelada, incompleta)
    const vendas = await db.vendas.toArray();
    const archivable = vendas.filter(v => ['quitada', 'cancelada', 'incompleta'].includes(v.status));
    
    const years = {};
    for (const v of archivable) {
        const year = v.data.substring(0, 4);
        if (!years[year]) years[year] = 0;
        years[year]++;
    }

    if (Object.keys(years).length === 0) {
        showToast('Nenhuma venda finalizada para arquivar', true);
        return;
    }

    const yearOptions = Object.entries(years)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([y, count]) => `<option value="${y}">${y} (${count} vendas)</option>`)
        .join('');

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📦 Arquivar por Ano</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="padding: 12px 0;">
            <p style="font-size: 14px; margin-bottom: 12px;">Escolha o ano para arquivar:</p>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
                Apenas vendas finalizadas (quitadas, canceladas, incompletas) serão arquivadas. Vendas ativas não são afetadas.
            </p>
            <div class="form-group">
                <select class="form-input" id="arquivo-ano">
                    ${yearOptions}
                </select>
            </div>
        </div>
        <button class="btn btn-accent" onclick="executarArquivar()">
            📦 Arquivar
        </button>
    `);
}

async function executarArquivar() {
    const ano = document.getElementById('arquivo-ano').value;
    if (!ano) return;

    const vendas = await db.vendas.toArray();
    const toArchive = vendas.filter(v => 
        ['quitada', 'cancelada', 'incompleta'].includes(v.status) && v.data.startsWith(ano)
    );

    if (toArchive.length === 0) {
        showToast('Nenhuma venda para arquivar neste ano', true);
        return;
    }

    // Collect all related data
    const vendaIds = toArchive.map(v => v.id);
    const parcelas = [];
    const pagamentos = [];
    for (const vId of vendaIds) {
        const vParcelas = await db.parcelas.where('vendaId').equals(vId).toArray();
        parcelas.push(...vParcelas);
        for (const p of vParcelas) {
            const vPagamentos = await db.pagamentos.where('parcelaId').equals(p.id).toArray();
            pagamentos.push(...vPagamentos);
        }
    }

    // Save to arquivo table
    await db.arquivo.add({
        tipo: 'vendas',
        ano: ano,
        data: new Date().toISOString(),
        vendas: toArchive,
        parcelas: parcelas,
        pagamentos: pagamentos,
        totalVendas: toArchive.length,
        totalParcelas: parcelas.length
    });

    // Delete from main tables
    for (const p of pagamentos) await db.pagamentos.delete(p.id);
    for (const p of parcelas) await db.parcelas.delete(p.id);
    for (const v of toArchive) await db.vendas.delete(v.id);

    showToast(`📦 ${toArchive.length} vendas de ${ano} arquivadas!`);
    closeModal();
    navigateTo('config');
}

async function abrirArquivo() {
    const arquivos = await db.arquivo.toArray();

    if (arquivos.length === 0) {
        openModal(`
            <div class="modal-header">
                <h2 class="modal-title">📂 Arquivo</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <div class="empty-text">Nenhum dado arquivado</div>
            </div>
        `);
        return;
    }

    const list = arquivos.map(a => `
        <div class="list-item" style="flex-wrap: wrap;">
            <div class="item-icon">📦</div>
            <div class="item-info">
                <div class="item-name">Ano ${a.ano}</div>
                <div class="item-detail">${a.totalVendas} vendas • ${a.totalParcelas} parcelas • Arquivado em ${formatDate(a.data.split('T')[0])}</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="width:auto; font-size:11px;" onclick="confirmarDesarquivar(${a.id})">
                ↩️ Restaurar
            </button>
        </div>
    `).join('');

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📂 Arquivo</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="padding: 8px 0;">
            ${list}
        </div>
    `);
}

function confirmarDesarquivar(arquivoId) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">↩️ Restaurar Arquivo</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="text-align: center; padding: 16px 0;">
            <p style="font-size: 14px;">Tem certeza que quer restaurar estes dados?</p>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                As vendas voltarão para as listas principais.
            </p>
        </div>
        <div class="confirm-actions">
            <button class="btn btn-ghost" onclick="abrirArquivo()">Cancelar</button>
            <button class="btn btn-accent" onclick="executarDesarquivar(${arquivoId})">Restaurar</button>
        </div>
    `);
}

async function executarDesarquivar(arquivoId) {
    const arquivo = await db.arquivo.get(arquivoId);
    if (!arquivo) return;

    // Restore vendas
    for (const v of arquivo.vendas) {
        delete v.id; // Let IndexedDB assign new ID
        const newVendaId = await db.vendas.add(v);
        
        // Restore parcelas for this venda
        const vendaParcelas = arquivo.parcelas.filter(p => p.vendaId === v.id || p.vendaId === newVendaId);
        // Actually we need to map old vendaId to new
    }

    // Simpler approach: bulk add with original structure
    // Since IDs are auto-increment and may conflict, we re-add without IDs
    const vendaIdMap = {};
    for (const v of arquivo.vendas) {
        const oldId = v.id;
        delete v.id;
        const newId = await db.vendas.add(v);
        vendaIdMap[oldId] = newId;
    }

    const parcelaIdMap = {};
    for (const p of arquivo.parcelas) {
        const oldId = p.id;
        delete p.id;
        p.vendaId = vendaIdMap[p.vendaId] || p.vendaId;
        const newId = await db.parcelas.add(p);
        parcelaIdMap[oldId] = newId;
    }

    for (const pg of arquivo.pagamentos) {
        delete pg.id;
        pg.vendaId = vendaIdMap[pg.vendaId] || pg.vendaId;
        pg.parcelaId = parcelaIdMap[pg.parcelaId] || pg.parcelaId;
        await db.pagamentos.add(pg);
    }

    // Delete arquivo entry
    await db.arquivo.delete(arquivoId);

    showToast(`↩️ ${arquivo.totalVendas} vendas restauradas!`);
    closeModal();
    navigateTo('config');
}
