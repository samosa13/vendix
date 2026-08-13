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
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; font-size: 14px;">Mostrar rota no mapa</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Mostra botão "Abrir Rota" na tela de Cobranças
                    </div>
                </div>
                <label style="position: relative; display: inline-block; width: 50px; height: 28px;">
                    <input type="checkbox" id="cfg-maps" ${config.mostrarRotaMaps !== false ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${config.mostrarRotaMaps !== false ? 'var(--accent)' : 'var(--border)'};border-radius:28px;transition:.3s;" onclick="this.previousElementSibling.checked=!this.previousElementSibling.checked; this.style.background=this.previousElementSibling.checked?'var(--accent)':'var(--border)'; this.querySelector('span').style.transform=this.previousElementSibling.checked?'translateX(22px)':'translateX(0)';">
                        <span style="position:absolute;height:22px;width:22px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s;transform:${config.mostrarRotaMaps !== false ? 'translateX(22px)' : 'translateX(0)'};"></span>
                    </span>
                </label>
            </div>
        </div>

        <!-- Agrupar vendas -->
        <div class="card" style="margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; font-size: 14px;">Agrupar vendas por cliente</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Mostra 1 ficha por cliente com todas as vendas ativas
                    </div>
                </div>
                <label style="position: relative; display: inline-block; width: 50px; height: 28px;">
                    <input type="checkbox" id="cfg-agrupar" ${config.agruparVendasCliente ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${config.agruparVendasCliente ? 'var(--accent)' : 'var(--border)'};border-radius:28px;transition:.3s;" onclick="this.previousElementSibling.checked=!this.previousElementSibling.checked; this.style.background=this.previousElementSibling.checked?'var(--accent)':'var(--border)'; this.querySelector('span').style.transform=this.previousElementSibling.checked?'translateX(22px)':'translateX(0)';">
                        <span style="position:absolute;height:22px;width:22px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s;transform:${config.agruparVendasCliente ? 'translateX(22px)' : 'translateX(0)'};"></span>
                    </span>
                </label>
            </div>
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
    await db.produtos.clear();
    await db.clientes.clear();
    await db.vendas.clear();
    await db.parcelas.clear();
    await db.pagamentos.clear();
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
