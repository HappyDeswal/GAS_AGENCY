import { resetDemo, data } from '../demo-data.js';
import { select, dialog, toast } from '../ui.js';
import { setTheme } from '../theme.js';
export function settingsPage() {
    return `<div class="grid-two"><section class="glass panel"><h2>Appearance</h2><div class="settings-row"><div><h3>Color theme</h3><p>A comfortable space for your work.</p></div>${select('Theme', 'settings-theme', ['dark', 'light'], document.documentElement.dataset.theme)}</div><div class="settings-row"><div><h3>Reduce animation</h3><p>Applies for this browser tab. System preferences are respected.</p></div><input aria-label="Reduce animation" id="motion-setting" type="checkbox" style="width:20px" ${document.documentElement.dataset.motion === 'reduced' ? 'checked' : ''}></div><h2 class="section-gap">Notification preferences</h2><p class="form-note section-gap">Preview only. No external notifications are sent.</p>${['Stock alerts', 'Delivery updates', 'Settlement reminders'].map((s, i) => `<label class="check-label" style="margin-top:12px"><input type="checkbox" class="notification-setting" data-pref="${i}" checked>${s}</label>`).join('')}</section><section class="glass panel"><h2>Profile preview</h2><div class="settings-row"><span class="avatar">AD</span><div><h3>Agency Owner</h3><p>${data.connected ? 'Authenticated agency workspace' : 'Demo administrator · No account connected'}</p></div></div><h2 class="section-gap">Agency information preview</h2><p class="section-gap">GAS AGENCY · Demo workspace</p><p>Sample Colony · Fictional address</p><p>Phone: XXXXX XXXXX</p><h2 class="section-gap">About the application</h2><p class="section-gap">Version 1.0 · HTML, CSS & vanilla JavaScript.</p><p>${data.connected ? 'Agency database connection enabled. Production OTP completion remains locked until verified integration is available.' : 'Frontend demo. Authentication, OTP, payments, and database services are not connected.'}</p><button class="button section-gap" id="reset-demo">Reset demo data</button></section></div>`;
}
export function initializeSettings(refresh) {
    const theme = document.querySelector('[name="settings-theme"]');
    if (theme) {
        theme.onchange = () => setTheme(theme.value);
        document.querySelector('#motion-setting').onchange = e => {
            const motion = e.target.checked ? 'reduced' : 'full';
            document.documentElement.dataset.motion = motion;
            try {
                sessionStorage.setItem('gas-motion', motion);
            }
            catch {
            }
            refresh();
        };
        document.querySelectorAll('.notification-setting').forEach(c => {
            try {
                c.checked = sessionStorage.getItem('gas-notification-' + c.dataset.pref) !== 'false';
            }
            catch {
            }
            c.onchange = () => {
                try {
                    sessionStorage.setItem('gas-notification-' + c.dataset.pref, c.checked);
                }
                catch {
                }
                toast('Demo notification preference updated for this tab.');
            };
        });
        document.querySelector('#reset-demo').onclick = () => dialog('Reset fictional demo data?', `<p>This removes changes made in this tab and restores all original sample records.</p><form><div class="form-actions"><button class="button primary">Reset demo data</button></div></form>`, () => {
            resetDemo();
            refresh();
            toast('Original demonstration data restored.');
        });
    }
}
