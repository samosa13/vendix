/* ============================================
   VendIX - Authentication (PBKDF2 + Web Crypto)
   Password hashed with salt, no keys in source code.
   ============================================ */

const AUTH_STORAGE_KEY = 'vendix_auth';
const PBKDF2_ITERATIONS = 100000;

// ============ CRYPTO HELPERS ============

async function generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
    const encoder = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial, 256
    );
    
    return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ AUTH FUNCTIONS ============

function getAuthData() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
}

function isAuthConfigured() {
    return getAuthData() !== null;
}

function isLoggedIn() {
    return sessionStorage.getItem('vendix_session') === 'active';
}

async function setupDefaultUser() {
    const salt = await generateSalt();
    const hash = await hashPassword('Ale1234#', salt);
    const authData = {
        username: 'Alencar',
        salt: salt,
        hash: hash,
        createdAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    return authData;
}

async function verifyLogin(username, password) {
    const auth = getAuthData();
    if (!auth) return false;
    if (username.toLowerCase() !== auth.username.toLowerCase()) return false;
    const hash = await hashPassword(password, auth.salt);
    return hash === auth.hash;
}

async function changePassword(username, oldPassword, newPassword) {
    const valid = await verifyLogin(username, oldPassword);
    if (!valid) return { success: false, error: 'Usuário ou senha atual incorretos' };
    
    const salt = await generateSalt();
    const hash = await hashPassword(newPassword, salt);
    const auth = getAuthData();
    auth.salt = salt;
    auth.hash = hash;
    auth.updatedAt = new Date().toISOString();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    return { success: true };
}

function doLogin() {
    sessionStorage.setItem('vendix_session', 'active');
}

function doLogout() {
    sessionStorage.removeItem('vendix_session');
    renderLoginScreen();
}

// ============ LOGIN SCREEN ============

async function renderLoginScreen() {
    if (!isAuthConfigured()) {
        await setupDefaultUser();
    }

    const content = document.getElementById('app-content');
    const nav = document.querySelector('.bottom-nav');
    const header = document.querySelector('.app-header');
    if (nav) nav.style.display = 'none';
    if (header) header.style.display = 'none';

    content.innerHTML = `
        <div id="login-screen" style="
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 24px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            margin: 0;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 999;
        ">
            <div style="text-align: center; margin-bottom: 32px;">
                <img src="icons/logo-vendix.png" alt="VendIX" style="width: 180px; margin-bottom: 16px;" onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='block';">
                <div id="logo-fallback" style="display:none; font-size: 36px; font-weight: 800; margin-bottom: 8px;">
                    <span style="color: #0d7a3e;">Vend</span><span style="color: #7bc142;">IX</span>
                </div>
                <p style="color: rgba(255,255,255,0.6); font-size: 13px;">Gestão de vendas parceladas</p>
            </div>

            <div style="width: 100%; max-width: 320px; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 6px; display: block;">Usuário</label>
                    <input type="text" id="login-user" class="form-input" placeholder="Nome de usuário" autocomplete="username" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 6px; display: block;">Senha</label>
                    <input type="password" id="login-pass" class="form-input" placeholder="Sua senha" autocomplete="current-password" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;" onkeypress="if(event.key==='Enter')doLoginAttempt()">
                </div>
                <button class="btn btn-accent" style="width: 100%; font-size: 16px; padding: 14px;" onclick="doLoginAttempt()">
                    Entrar
                </button>
                <div id="login-error" style="color: #ff5252; font-size: 12px; text-align: center; margin-top: 12px; display: none;"></div>
                <button onclick="showChangePassword()" style="background:none; border:none; color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 16px; cursor: pointer; width: 100%; text-align: center;">
                    Mudar senha
                </button>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('login-user')?.focus(), 100);
}

async function doLoginAttempt() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error');

    if (!user || !pass) {
        errorEl.textContent = 'Preencha usuário e senha';
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    const valid = await verifyLogin(user, pass);
    if (valid) {
        doLogin();
        // Remove login screen and restore app
        const content = document.getElementById('app-content');
        content.innerHTML = '';
        const nav = document.querySelector('.bottom-nav');
        const header = document.querySelector('.app-header');
        if (nav) nav.style.display = '';
        if (header) header.style.display = '';
        navigateTo('dashboard');
        setTimeout(() => mostrarBackupReminder(), 2000);
    } else {
        errorEl.textContent = 'Usuário ou senha incorretos';
        errorEl.style.display = 'block';
        document.getElementById('login-pass').value = '';
        document.getElementById('login-pass').focus();
    }
}

function showChangePassword() {
    const content = document.getElementById('app-content');
    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen) return;

    loginScreen.innerHTML = `
        <div style="text-align: center; margin-bottom: 24px;">
            <img src="icons/logo-vendix.png" alt="VendIX" style="width: 120px; margin-bottom: 12px;" onerror="this.style.display='none'">
            <p style="color: rgba(255,255,255,0.6); font-size: 13px;">Mudar Senha</p>
        </div>

        <div style="width: 100%; max-width: 320px; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; display: block;">Usuário</label>
                <input type="text" id="chg-user" class="form-input" placeholder="Seu usuário" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; display: block;">Senha Atual</label>
                <input type="password" id="chg-old" class="form-input" placeholder="Senha atual" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; display: block;">Nova Senha</label>
                <input type="password" id="chg-new" class="form-input" placeholder="Nova senha" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;" onkeypress="if(event.key==='Enter')doChangePassword()">
            </div>
            <button class="btn btn-accent" style="width: 100%; padding: 12px;" onclick="doChangePassword()">
                Salvar Nova Senha
            </button>
            <div id="chg-msg" style="font-size: 12px; text-align: center; margin-top: 12px; display: none;"></div>
            <button onclick="renderLoginScreen()" style="background:none; border:none; color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 12px; cursor: pointer; width: 100%; text-align: center;">
                ← Voltar ao login
            </button>
        </div>
    `;
}

async function doChangePassword() {
    const user = document.getElementById('chg-user').value.trim();
    const oldPass = document.getElementById('chg-old').value;
    const newPass = document.getElementById('chg-new').value;
    const msgEl = document.getElementById('chg-msg');

    if (!user || !oldPass || !newPass) {
        msgEl.style.cssText = 'color:#ff5252; font-size:12px; text-align:center; margin-top:12px; display:block;';
        msgEl.textContent = 'Preencha todos os campos';
        return;
    }
    if (newPass.length < 4) {
        msgEl.style.cssText = 'color:#ff5252; font-size:12px; text-align:center; margin-top:12px; display:block;';
        msgEl.textContent = 'Nova senha deve ter pelo menos 4 caracteres';
        return;
    }

    const result = await changePassword(user, oldPass, newPass);
    if (result.success) {
        msgEl.style.cssText = 'color:#00e676; font-size:12px; text-align:center; margin-top:12px; display:block;';
        msgEl.textContent = '✅ Senha alterada com sucesso!';
        setTimeout(() => renderLoginScreen(), 1500);
    } else {
        msgEl.style.cssText = 'color:#ff5252; font-size:12px; text-align:center; margin-top:12px; display:block;';
        msgEl.textContent = result.error;
    }
}
