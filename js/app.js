/* ============================================
   VendIX - App Router & Navigation
   ============================================ */

// Page registry
const pages = {
    dashboard: { title: 'VendIX', render: renderDashboard },
    produtos: { title: 'Produtos', render: renderProdutos },
    clientes: { title: 'Clientes', render: renderClientes },
    vendas: { title: 'Vendas', render: renderVendas },
    cobrancas: { title: 'Cobranças', render: renderCobrancas },
    relatorios: { title: 'Relatórios', render: renderRelatorios },
    config: { title: 'Configurações', render: renderConfig }
};

let currentPage = 'dashboard';

// Navigate to page
function navigateTo(page) {
    if (!pages[page]) return;

    // Refresh session on every navigation
    if (typeof refreshSession === 'function') refreshSession();

    currentPage = page;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update title (use config name for dashboard)
    const title = page === 'dashboard' ? configVal('nomeNegocio') : pages[page].title;
    document.getElementById('page-title').textContent = title;

    // Render page
    pages[page].render();
}

// Init app
document.addEventListener('DOMContentLoaded', async () => {
    // One-time migrations
    const cfg = localStorage.getItem('vendix_config');
    if (cfg) {
        const parsed = JSON.parse(cfg);
        if (parsed.nomeNegocio === 'Alencar Vendas') {
            parsed.nomeNegocio = 'Alencar Enxovais';
            localStorage.setItem('vendix_config', JSON.stringify(parsed));
        }
    }

    // Load demo data if first time
    await carregarDadosDemo();

    // Nav button clicks
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
        });
    });

    // Check login
    if (!isLoggedIn()) {
        await renderLoginScreen();
        return; // Stop init — login screen handles the rest
    }

    // Start on dashboard
    navigateTo('dashboard');

    // Check backup reminder after short delay
    setTimeout(() => {
        mostrarBackupReminder();
    }, 2000);
});
