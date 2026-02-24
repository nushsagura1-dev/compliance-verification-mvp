/*!
 * compliance-badge.js — Lightweight Compliance Status Badge
 * Embeds a compliance status badge by fetching the /verify API endpoint.
 *
 * Usage:
 *   <div id="compliance-badge" data-domain="example.com"></div>
 *   <script src="https://your-api.com/badge/badge.js"></script>
 *
 * Or with explicit API URL:
 *   <script
 *     src="https://your-api.com/badge/badge.js"
 *     data-api="https://your-api.com">
 *   </script>
 */
(function () {
  'use strict';

  var STYLE = [
    '.cs-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;',
    'border-radius:999px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'font-size:13px;font-weight:600;text-decoration:none;cursor:default;',
    'border:1.5px solid;transition:opacity .2s;}',
    '.cs-badge--active{background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.3);}',
    '.cs-badge--revoked{background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.3);}',
    '.cs-badge--unknown{background:rgba(107,114,128,.12);color:#6b7280;border-color:rgba(107,114,128,.3);}',
    '.cs-badge-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
    '.cs-badge--active .cs-badge-dot{background:#10b981;animation:cs-pulse 2s infinite;}',
    '.cs-badge--revoked .cs-badge-dot{background:#ef4444;}',
    '.cs-badge--unknown .cs-badge-dot{background:#6b7280;}',
    '@keyframes cs-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('cs-badge-style')) return;
    var el = document.createElement('style');
    el.id = 'cs-badge-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function getApiBase() {
    // Allow override via script tag: <script src="..." data-api="https://...">
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var api = scripts[i].getAttribute('data-api');
      if (api) return api.replace(/\/$/, '');
    }
    // Default: same origin
    return '';
  }

  function renderBadge(container, state, domain) {
    var modifier = state === 'active' ? 'active' : state === 'revoked' ? 'revoked' : 'unknown';
    var label = state === 'active' ? '✓ Compliant — Active' : state === 'revoked' ? '✗ Revoked' : '? Unknown';

    var badge = document.createElement('span');
    badge.className = 'cs-badge cs-badge--' + modifier;
    badge.title = 'Compliance status for ' + domain + ' — powered by Compliance Status API';

    var dot = document.createElement('span');
    dot.className = 'cs-badge-dot';

    var text = document.createTextNode(label);

    badge.appendChild(dot);
    badge.appendChild(text);

    container.innerHTML = '';
    container.appendChild(badge);
  }

  function renderError(container, domain) {
    renderBadge(container, 'unknown', domain);
  }

  function fetchAndRender(container, domain, apiBase) {
    var url = apiBase + '/verify?domain=' + encodeURIComponent(domain);

    // Use XMLHttpRequest for maximum compatibility (no fetch polyfill needed)
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          renderBadge(container, data.status, domain);
        } catch (e) {
          renderError(container, domain);
        }
      } else {
        renderError(container, domain);
      }
    };
    xhr.onerror = function () { renderError(container, domain); };
    xhr.send();
  }

  function init() {
    injectStyle();
    var apiBase = getApiBase();
    var containers = document.querySelectorAll('[data-domain]');
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      var domain = container.getAttribute('data-domain');
      if (domain) {
        renderBadge(container, 'loading', domain);
        fetchAndRender(container, domain, apiBase);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
