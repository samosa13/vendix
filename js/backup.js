/* ============================================
   VendIX - Backup & Restore System
   ============================================ */

// Export all data as JSON
async function exportarBackup() {
    const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        config: getConfig(),
        produtos: await db.produtos.toArray(),
        clientes: await db.clientes.toArray(),
        vendas: await db.vendas.toArray(),
        parcelas: await db.parcelas.toArray(),
        pagamentos: await db.pagamentos.toArray()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const fileName = `VendIX_Backup_${formatDateFile(new Date())}.json`;

    // Try Web Share API first (mobile - opens "Share with..." menu)
    if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/json' });
        const shareData = { files: [file], title: 'Backup VendIX', text: 'Backup dos dados do VendIX' };

        if (navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                registrarBackupFeito();
                showToast('✅ Backup enviado!');
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    // User cancelled share - still save locally
                    console.log('Share cancelled, downloading instead');
                } else {
                    console.error('Share failed:', err);
                }
            }
        }
    }

    // Fallback: download file directly
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    registrarBackupFeito();
    showToast('✅ Backup salvo!');
}

// Import data from JSON file
async function importarBackup(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.produtos || !data.clientes) {
            showToast('❌ Arquivo inválido!', true);
            return;
        }

        // Confirm before overwriting
        openModal(`
            <div class="modal-header">
                <h2 class="modal-title">📤 Restaurar Backup</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div style="padding: 16px 0; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
                <p style="font-size: 15px; margin-bottom: 8px;">
                    Tem certeza que quer restaurar?
                </p>
                <p style="font-size: 13px; color: var(--text-secondary);">
                    Backup de: <strong>${formatDate(data.exportDate.split('T')[0])}</strong><br>
                    ${data.produtos.length} produtos • ${data.clientes.length} clientes • ${data.vendas.length} vendas
                </p>
                <p style="font-size: 13px; color: var(--danger); margin-top: 8px;">
                    Isso vai SUBSTITUIR todos os dados atuais!
                </p>
            </div>
            <div class="confirm-actions">
                <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-accent" id="confirm-restore">Restaurar</button>
            </div>
        `);

        document.getElementById('confirm-restore').onclick = async () => {
            await executarRestore(data);
        };
    } catch (err) {
        showToast('❌ Erro ao ler arquivo!', true);
        console.error(err);
    }
}

async function executarRestore(data) {
    try {
        // Clear all tables
        await db.produtos.clear();
        await db.clientes.clear();
        await db.vendas.clear();
        await db.parcelas.clear();
        await db.pagamentos.clear();

        // Import data
        if (data.produtos.length > 0) await db.produtos.bulkAdd(data.produtos);
        if (data.clientes.length > 0) await db.clientes.bulkAdd(data.clientes);
        if (data.vendas.length > 0) await db.vendas.bulkAdd(data.vendas);
        if (data.parcelas.length > 0) await db.parcelas.bulkAdd(data.parcelas);
        if (data.pagamentos.length > 0) await db.pagamentos.bulkAdd(data.pagamentos);

        // Restore config
        if (data.config) {
            saveConfig(data.config);
        }

        closeModal();
        showToast('✅ Dados restaurados!');
        navigateTo('dashboard');
    } catch (err) {
        showToast('❌ Erro ao restaurar!', true);
        console.error(err);
    }
}

// Register that backup was done
function registrarBackupFeito() {
    localStorage.setItem('vendix_last_backup', new Date().toISOString());
}

// Check if backup reminder should show
function verificarBackupReminder() {
    const lastBackup = localStorage.getItem('vendix_last_backup');
    const config = getConfig();
    const horaBackup = config.horaBackup || '20:00';
    const frequencia = config.frequenciaBackup || 'diario';

    // Calculate required days between backups
    let diasNecessarios = 1;
    if (frequencia === '2dias') diasNecessarios = 2;
    if (frequencia === 'semanal') diasNecessarios = 7;

    if (!lastBackup) {
        // Never did backup - show after 3 days of use
        const firstUse = localStorage.getItem('vendix_first_use');
        if (!firstUse) {
            localStorage.setItem('vendix_first_use', new Date().toISOString());
            return false;
        }
        const daysSinceFirst = Math.floor((Date.now() - new Date(firstUse).getTime()) / (1000*60*60*24));
        return daysSinceFirst >= 3;
    }

    // Check if enough days have passed since last backup
    const lastDate = new Date(lastBackup);
    const daysSinceBackup = Math.floor((Date.now() - lastDate.getTime()) / (1000*60*60*24));
    if (daysSinceBackup < diasNecessarios) return false;

    // Check if current time is past the configured hour
    const now = new Date();
    const [h, m] = horaBackup.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(h, m, 0, 0);

    return now >= targetTime;
}

// Show backup reminder banner
function mostrarBackupReminder() {
    if (!verificarBackupReminder()) return;

    // Auto-backup: silently download backup file
    autoBackupSilencioso();
}

// Automatic silent backup (downloads file without user interaction)
async function autoBackupSilencioso() {
    try {
        const data = {
            version: 1,
            exportDate: new Date().toISOString(),
            config: getConfig(),
            produtos: await db.produtos.toArray(),
            clientes: await db.clientes.toArray(),
            vendas: await db.vendas.toArray(),
            parcelas: await db.parcelas.toArray(),
            pagamentos: await db.pagamentos.toArray()
        };

        // Only backup if there's actual data
        if (data.produtos.length === 0 && data.clientes.length === 0 && data.vendas.length === 0) {
            return; // No data to backup
        }

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const fileName = `VendIX_Backup_${formatDateFile(new Date())}.json`;

        // Silent download (goes to Downloads folder)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        registrarBackupFeito();
        showToast('💾 Backup automático salvo!');
    } catch (err) {
        console.error('Auto-backup failed:', err);
    }
}

// Helper: format date for filename
function formatDateFile(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}${m}${y}`;
}

// Trigger file input for restore
function abrirRestoreFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) importarBackup(file);
    };
    input.click();
}
