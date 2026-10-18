import { brand, url } from '../navigation.js';
import { icon, field, toast, dialog } from '../ui.js';
export function renderAuth(page) {
    document.body.classList.add('auth-page');
    document.body.innerHTML = page === 'login' ? `<main class="auth-shell glass">${brand()}<h1>Welcome back.</h1><p>Your agency. One beautifully simple workspace.</p><form id="login-form">${field('Email or username', 'username', 'text', '', 'required autocomplete="username"')}<div class="auth-password">${field('Password (optional demo preview)', 'password', 'password', '', 'autocomplete="off"')}<button type="button" id="password-toggle" class="icon-button" aria-label="Show password">Show</button></div><div class="auth-options"><label class="check-label"><input type="checkbox" name="remember">Remember me (preview)</label><button type="button" class="button small" id="forgot-password">Forgot password?</button></div><p id="login-error" role="alert" class="danger"></p><button class="button primary">Continue to Demo ${icon('arrow')}</button></form><p class="auth-notice">DEMO MODE — Authentication is not connected.<br>No credentials are stored. Any username can enter the demo.</p><div class="auth-footer">GAS AGENCY · Operations, simplified.</div></main>` : `<main class="role-shell">${brand()}<div class="eyebrow">A WORKSPACE FOR EVERY ROLE</div><h1>Make yourself at home.</h1><p>Choose a portal to explore the GAS AGENCY demo.</p><div class="role-cards"><article class="role-card glass tilt">${icon('dashboard')}<h2>Owner / Admin</h2><p>Manage complete agency operations. From your first cylinder to your last delivery of the day.</p><a class="button primary" href="${url('pages/admin/dashboard.html')}">Open Admin Demo ${icon('arrow')}</a></article><article class="role-card glass tilt">${icon('deliveries')}<h2>Delivery Boy</h2><p>Manage assigned deliveries and daily work. Everything you need for a smoother route.</p><a class="button primary" href="${url('pages/delivery/dashboard.html')}">Open Delivery Demo ${icon('arrow')}</a></article></div><p class="auth-notice">DEMO ROLE SELECTOR · This is a frontend preview, not real authorization.</p><a class="button small" href="${url('pages/auth/login.html')}">← Back to login preview</a></main>`;
    document.body.insertAdjacentHTML('afterbegin', `<div class="auth-theme"><span>Make it your space</span><button id="theme-toggle" class="icon-button" aria-label="Switch color theme">${icon('theme')}</button></div>`);
    document.body.insertAdjacentHTML('beforeend', '<dialog id="modal" aria-label="Demo information"></dialog><div id="toast" role="status"></div>');
    document.querySelector('#password-toggle')?.addEventListener('click', e => {
        const input = document.querySelector('[name="password"]');
        input.type = input.type === 'password' ? 'text' : 'password';
        e.currentTarget.textContent = input.type === 'password' ? 'Show' : 'Hide';
        e.currentTarget.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
    });
    document.querySelector('#forgot-password')?.addEventListener('click', () => dialog('Password recovery preview', '<p>Authentication is not connected. No password reset can be sent. Enter any fictional username and continue to the demo.</p>'));
    document.querySelector('#login-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const username = e.currentTarget.elements.username.value.trim();
        if (!username || username.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
            document.querySelector('#login-error').textContent = 'Enter a username or a valid email address.';
            return;
        }
        e.currentTarget.elements.password.value = '';
        location.href = url('pages/auth/select-role.html');
    });
}
