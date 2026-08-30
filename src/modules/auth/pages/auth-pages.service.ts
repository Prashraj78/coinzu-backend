import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Env } from '../../../common/config/env';
import { LINK_TOKEN_PATTERN } from '../link-token.service';

const ASSETS_DIR = join(__dirname, 'assets');

/** Keeps a JSON blob embedded in an inline <script> from ever closing the tag early. */
const inlineJson = (json: string): string => json.replace(/<\/script/gi, '<\\/script');

const BASE_STYLE = `
  :root{--cz-purple-900:#2e1150;--cz-purple-700:#4b1d80;--cz-purple-600:#6c2eb5;--cz-gold-500:#ffc93c;--cz-gold-600:#f5a623;--cz-text:#2e1150;--cz-muted:#7a6f96;--cz-danger:#c0392b;--cz-border:#e7defc;}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(160deg,var(--cz-purple-900) 0%,var(--cz-purple-700) 45%,var(--cz-purple-600) 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:var(--cz-text)}
  .card{width:100%;max-width:420px;background:#fff;border-radius:20px;padding:36px 32px 32px;box-shadow:0 20px 60px rgba(46,17,80,0.35);text-align:center}
  .logo{height:36px;margin-bottom:20px}
  .anim{width:140px;height:140px;margin:0 auto 8px}
  h1{font-size:20px;margin:12px 0 8px}
  p.sub{color:var(--cz-muted);font-size:14.5px;line-height:1.55;margin:0 0 4px}
  .hint{margin-top:22px;font-size:13px;color:var(--cz-muted)}
  form{margin-top:20px;text-align:left}
  label{display:block;font-size:13px;font-weight:600;color:var(--cz-purple-900);margin:14px 0 6px}
  input[type=password]{width:100%;padding:13px 14px;border:1.5px solid var(--cz-border);border-radius:12px;font-size:15px;outline:none;transition:border-color .15s}
  input[type=password]:focus{border-color:var(--cz-purple-600)}
  .field-error{color:var(--cz-danger);font-size:12.5px;margin-top:6px;min-height:16px}
  button.primary{width:100%;margin-top:22px;padding:14px;border:none;border-radius:999px;background:var(--cz-gold-500);color:var(--cz-purple-900);font-weight:700;font-size:15.5px;cursor:pointer;transition:background .15s,opacity .15s}
  button.primary:hover{background:var(--cz-gold-600)}
  button.primary:disabled{opacity:.6;cursor:not-allowed}
  .banner{display:none;background:#fdecea;color:var(--cz-danger);border-radius:10px;padding:10px 14px;font-size:13px;margin-top:16px;text-align:left}
  .banner.show{display:block}
  [hidden]{display:none !important}
`;

interface ShellOptions {
  title: string;
  head?: string;
  body: string;
  script: string;
}

@Injectable()
export class AuthPagesService {
  private readonly logoDataUri: string;
  private readonly loaderAnimJson: string;
  private readonly successAnimJson: string;
  private readonly failedAnimJson: string;

  constructor() {
    this.logoDataUri = `data:image/png;base64,${readFileSync(join(ASSETS_DIR, 'coinzu-logo.png')).toString('base64')}`;
    this.loaderAnimJson = inlineJson(readFileSync(join(ASSETS_DIR, 'loader.json'), 'utf8'));
    this.successAnimJson = inlineJson(readFileSync(join(ASSETS_DIR, 'success.json'), 'utf8'));
    this.failedAnimJson = inlineJson(readFileSync(join(ASSETS_DIR, 'failed.json'), 'utf8'));
  }

  /** `GET /api/auth/email/verify?token=`. The token is trusted here — the caller already checked its shape. */
  renderVerifyEmailPage(rawToken: string | undefined): string {
    const token = typeof rawToken === 'string' && LINK_TOKEN_PATTERN.test(rawToken) ? rawToken : null;

    if (!token) {
      return this.shell({
        title: 'Link expired — Coinzu',
        body: this.invalidBody(
          "This confirmation link isn't valid",
          'It may have expired or already been used. Head back to the app and request a new one.',
        ),
        script: `showState('error');`,
      });
    }

    const body = `
      <img class="logo" src="${this.logoDataUri}" alt="Coinzu" />
      <div class="anim" id="anim"></div>
      <h1 id="heading">Confirming your email…</h1>
      <p class="sub" id="subtext">Just a moment, this only takes a second.</p>
      <p class="hint" id="hint" hidden>Open the Coinzu app and check your account details.</p>
    `;

    const script = `
      showState('loading');
      fetch('${Env.urls.api}/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ${JSON.stringify(token)} }),
      })
        .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
        .then(function (result) {
          if (!result.ok) throw result.json;
          var accessToken = result.json && result.json.data && result.json.data.access_token;
          if (accessToken) {
            try { localStorage.setItem('coinzu_access_token', accessToken); } catch (e) {}
          }
          setHeading('Email verified!');
          setSubtext("You're all set — open the Coinzu app to check your account details.");
          document.getElementById('hint').hidden = true;
          showState('success');
        })
        .catch(function (err) {
          var code = err && err.cz_error_code;
          setHeading("This link isn't valid");
          setSubtext(
            code === 'CZDAUTH015'
              ? 'It has expired or was already used. Head back to the app and request a new one.'
              : 'Something went wrong. Please try again from the app.'
          );
          showState('error');
        });
    `;

    return this.shell({ title: 'Confirm your email — Coinzu', body, script });
  }

  /** `GET /api/auth/password/reset?token=`. `tokenValid` is a pre-check so an expired link never shows a doomed form. */
  renderResetPasswordPage(rawToken: string | undefined, tokenValid: boolean): string {
    const token = typeof rawToken === 'string' && LINK_TOKEN_PATTERN.test(rawToken) ? rawToken : null;

    if (!token || !tokenValid) {
      return this.shell({
        title: 'Link expired — Coinzu',
        body: this.invalidBody(
          "This reset link isn't valid",
          'It may have expired or already been used. Head back to the app and request a new one.',
        ),
        script: `showState('error');`,
      });
    }

    const body = `
      <img class="logo" src="${this.logoDataUri}" alt="Coinzu" />
      <div class="anim" id="anim" hidden></div>
      <div id="formWrap">
        <h1>Set a new password</h1>
        <p class="sub">Choose a strong password for your Coinzu account.</p>
        <form id="resetForm" novalidate>
          <label for="password">New password</label>
          <input type="password" id="password" minlength="8" required autocomplete="new-password" />
          <div class="field-error" id="passwordError"></div>

          <label for="confirmPassword">Confirm password</label>
          <input type="password" id="confirmPassword" minlength="8" required autocomplete="new-password" />
          <div class="field-error" id="confirmError"></div>

          <div class="banner" id="formBanner"></div>
          <button class="primary" type="submit" id="submitBtn">Reset password</button>
        </form>
      </div>
      <h1 id="heading" hidden></h1>
      <p class="sub" id="subtext" hidden></p>
      <p class="hint" id="hint" hidden>Open the Coinzu app and log in with your new password.</p>
    `;

    const script = `
      var form = document.getElementById('resetForm');
      var pwd = document.getElementById('password');
      var confirm = document.getElementById('confirmPassword');
      var banner = document.getElementById('formBanner');
      var submitBtn = document.getElementById('submitBtn');

      function setBanner(msg) {
        banner.textContent = msg || '';
        banner.classList.toggle('show', Boolean(msg));
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        document.getElementById('passwordError').textContent = '';
        document.getElementById('confirmError').textContent = '';
        setBanner('');

        if (pwd.value.length < 8) {
          document.getElementById('passwordError').textContent = 'Use at least 8 characters.';
          return;
        }
        if (pwd.value !== confirm.value) {
          document.getElementById('confirmError').textContent = 'Passwords do not match.';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting…';

        fetch('${Env.urls.api}/api/auth/password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: ${JSON.stringify(token)}, password: pwd.value }),
        })
          .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
          .then(function (result) {
            if (!result.ok) throw result.json;
            document.getElementById('formWrap').hidden = true;
            document.getElementById('anim').hidden = false;
            setHeading('Password updated!');
            setSubtext('Open the Coinzu app and log in with your new password.');
            document.getElementById('heading').hidden = false;
            document.getElementById('subtext').hidden = false;
            showState('success');
          })
          .catch(function (err) {
            var code = err && err.cz_error_code;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset password';
            setBanner(
              code === 'CZDAUTH015'
                ? 'This link has expired. Please request a new one from the app.'
                : (err && err.cz_error_message) || 'Something went wrong. Please try again.'
            );
          });
      });
    `;

    return this.shell({ title: 'Reset your password — Coinzu', body, script });
  }

  private invalidBody(heading: string, subtext: string): string {
    return `
      <img class="logo" src="${this.logoDataUri}" alt="Coinzu" />
      <div class="anim" id="anim"></div>
      <h1>${heading}</h1>
      <p class="sub">${subtext}</p>
    `;
  }

  private shell(opts: ShellOptions): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${opts.title}</title>
<style>${BASE_STYLE}</style>
${opts.head ?? ''}
</head>
<body>
  <div class="card">
    ${opts.body}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js"></script>
  <script>
    var LOADER_ANIM = ${this.loaderAnimJson};
    var SUCCESS_ANIM = ${this.successAnimJson};
    var FAILED_ANIM = ${this.failedAnimJson};
    var currentAnim = null;

    function setHeading(text) {
      var el = document.getElementById('heading');
      if (el) el.textContent = text;
    }
    function setSubtext(text) {
      var el = document.getElementById('subtext');
      if (el) el.textContent = text;
    }

    function showState(state) {
      var container = document.getElementById('anim');
      if (!container) return;
      if (currentAnim) { currentAnim.destroy(); currentAnim = null; }
      container.innerHTML = '';
      container.hidden = false;

      var data = state === 'success' ? SUCCESS_ANIM : state === 'error' ? FAILED_ANIM : LOADER_ANIM;
      currentAnim = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: state === 'loading',
        autoplay: true,
        animationData: data,
      });

      var hint = document.getElementById('hint');
      if (hint && state === 'success') hint.hidden = false;
    }

    ${opts.script}
  </script>
</body>
</html>`;
  }
}
