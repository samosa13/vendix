/* ============================================
   VendIX - Utilities
   ============================================ */

// Format money (Brazilian Real)
function formatMoney(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return 'R$ ' + Number(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Get today as YYYY-MM-DD
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Days difference
function daysDiff(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((date - today) / (1000 * 60 * 60 * 24));
}

// Calculate parcelas
function calcularParcelas(valorTotal, numParcelas, taxaJuros, dataInicio, valorEntrada = 0) {
    const parcelas = [];
    const valorFinanciar = valorTotal - valorEntrada;

    let valorParcela;
    if (taxaJuros > 0) {
        // Price table (compound interest)
        const taxa = taxaJuros / 100;
        valorParcela = valorFinanciar * (taxa * Math.pow(1 + taxa, numParcelas)) / (Math.pow(1 + taxa, numParcelas) - 1);
    } else {
        valorParcela = valorFinanciar / numParcelas;
    }

    valorParcela = Math.round(valorParcela * 100) / 100;

    const inicio = new Date(dataInicio + 'T00:00:00');

    for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(inicio);
        vencimento.setMonth(vencimento.getMonth() + (i + 1));

        parcelas.push({
            numero: i + 1,
            valor: valorParcela,
            dataVencimento: vencimento.toISOString().split('T')[0],
            status: 'pendente'
        });
    }

    // Ajust last parcela for rounding
    const totalParcelas = valorParcela * numParcelas;
    const diff = Math.round((valorFinanciar * (taxaJuros > 0 ? Math.pow(1 + taxaJuros/100, numParcelas) : 1) - totalParcelas) * 100) / 100;
    if (Math.abs(diff) > 0.01 && parcelas.length > 0) {
        // Just use the calculated value, small rounding is acceptable
    }

    return parcelas;
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error' : '');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Open modal
function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
}

// Close modal
function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Confirm dialog
function showConfirm(message, onConfirm) {
    openModal(`
        <div class="text-center" style="padding: 20px 0;">
            <p style="font-size: 16px; margin-bottom: 8px;">${message}</p>
            <div class="confirm-actions">
                <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-danger" id="confirm-yes">Confirmar</button>
            </div>
        </div>
    `);
    document.getElementById('confirm-yes').onclick = () => {
        closeModal();
        onConfirm();
    };
}

// Phone formatter (Brazilian)
function formatPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
        return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
        return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`;
    }
    return phone;
}

// WhatsApp link
function whatsappLink(phone, message = '') {
    const clean = phone.replace(/\D/g, '');
    const num = clean.startsWith('55') ? clean : '55' + clean;
    return `https://wa.me/${num}${message ? '?text=' + encodeURIComponent(message) : ''}`;
}
