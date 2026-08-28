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
    return dateToLocalStr(new Date());
}

function proximoMes() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return dateToLocalStr(d);
}

// Convert Date to YYYY-MM-DD using local timezone (avoids UTC shift)
function dateToLocalStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Days difference
function daysDiff(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((date - today) / (1000 * 60 * 60 * 24));
}

// Calculate parcelas
function calcularParcelas(valorTotal, numParcelas, taxaJuros, dataInicio, valorEntrada = 0, primeiroVencimento = null) {
    const parcelas = [];
    const valorFinanciar = valorTotal - valorEntrada;

    if (valorFinanciar <= 0 || numParcelas <= 0) return parcelas;

    let valorParcela;
    if (taxaJuros > 0) {
        // Juros simples: valor + X% sobre o total, dividido entre parcelas
        const valorComJuros = valorFinanciar * (1 + taxaJuros / 100);
        valorParcela = valorComJuros / numParcelas;
    } else {
        valorParcela = valorFinanciar / numParcelas;
    }

    valorParcela = Math.round(valorParcela * 100) / 100;

    // If primeiroVencimento provided: parcela 1 = that date, next = +1 month each
    // If not: parcela 1 = dataInicio + 1 month (legacy behavior)
    const useCustomDate = !!primeiroVencimento;
    const base = new Date((useCustomDate ? primeiroVencimento : dataInicio) + 'T00:00:00');

    for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(base);
        vencimento.setMonth(vencimento.getMonth() + (useCustomDate ? i : i + 1));

        // Use local date (not UTC) to avoid timezone shift
        const yyyy = vencimento.getFullYear();
        const mm = String(vencimento.getMonth() + 1).padStart(2, '0');
        const dd = String(vencimento.getDate()).padStart(2, '0');

        parcelas.push({
            numero: i + 1,
            valor: valorParcela,
            dataVencimento: `${yyyy}-${mm}-${dd}`,
            status: 'pendente'
        });
    }

    // Adjust last parcela for rounding (total of all parcelas must equal PMT * n)
    const totalCalculado = valorParcela * numParcelas;
    const totalEsperado = taxaJuros > 0 ? valorParcela * numParcelas : valorFinanciar;
    // For no-interest: ensure sum exactly equals valorFinanciar
    if (taxaJuros === 0) {
        const somaAtual = parcelas.reduce((s, p) => s + p.valor, 0);
        const ajuste = Math.round((valorFinanciar - somaAtual) * 100) / 100;
        if (Math.abs(ajuste) > 0.001 && parcelas.length > 0) {
            parcelas[parcelas.length - 1].valor = Math.round((parcelas[parcelas.length - 1].valor + ajuste) * 100) / 100;
        }
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

// Open WhatsApp - iOS compatible (window.open fails in PWA WebView on iOS)
function openWhatsApp(phone, message = '') {
    const url = whatsappLink(phone, message);
    // Try window.open first (works on Android), fallback to location.href (works on iOS)
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
        // Popup blocked (iOS PWA) — use direct navigation
        location.href = url;
    }
}


// Expand all collapse sections on the current page
function expandirTodosCollapses() {
    document.querySelectorAll('.collapse-content.hidden').forEach(el => {
        el.classList.remove('hidden');
        const toggle = el.previousElementSibling;
        if (toggle && toggle.classList.contains('collapse-toggle')) {
            toggle.classList.add('open');
        }
    });
}

// Toggle collapsible section
function toggleCollapse(id) {
    const content = document.getElementById(id);
    const toggle = content.previousElementSibling;
    content.classList.toggle('hidden');
    toggle.classList.toggle('open');
}
