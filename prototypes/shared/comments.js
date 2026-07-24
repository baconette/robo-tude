/**
 * Prototype Comments — GitHub Issues-backed spatial commenting.
 * Sits on top of the prototype chrome iframe.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'proto-comments-token';
  const LABEL = 'prototype-comment';

  let token = localStorage.getItem(STORAGE_KEY);
  let user = null;
  let comments = [];
  let activeMode = false;
  let selectedThread = null;
  let overlay = null;
  let panel = null;
  let toggleBtn = null;

  function getConfig() {
    // Try to detect repo info from the page
    // Users can override via window.COMMENTS_CONFIG
    if (window.COMMENTS_CONFIG) return window.COMMENTS_CONFIG;

    // Default: detect from deployed GitHub Pages URL
    const host = window.location.hostname;
    const path = window.location.pathname.split('/').filter(Boolean);

    let config = {
      owner: '',
      repo: '',
      apiBase: 'https://api.github.com'
    };

    if (host.endsWith('.github.io')) {
      // Standard GitHub Pages: <user>.github.io/<repo>/
      config.owner = host.split('.')[0];
      config.repo = path[0] || '';
      config.apiBase = 'https://api.github.com';
    } else if (host.includes('github.com')) {
      // GitHub Enterprise Pages: pages.<host>/<org>/<repo>/
      // For GHE, set window.COMMENTS_CONFIG explicitly — apiBase varies by instance.
      config.owner = path[0] || '';
      config.repo = path[1] || '';
      config.apiBase = 'https://' + host.replace('pages.', '') + '/api/v3';
    }

    // Local dev: set window.COMMENTS_CONFIG = { owner, repo, apiBase, clientId }
    if (host === 'localhost' || host === '127.0.0.1') {
      console.warn('[Comments] Running locally — set window.COMMENTS_CONFIG for full functionality.');
    }

    return config;
  }

  function getPrototypeFolder() {
    const path = window.location.pathname.split('/').filter(Boolean);
    // Remove the repo name from the path for Pages deploys
    // For local dev, the path is the prototype folder
    return path[path.length - 1] || path[path.length - 2] || 'unknown';
  }

  // ── GitHub API ──

  async function apiRequest(endpoint, options = {}) {
    const config = getConfig();
    const url = `${config.apiBase}/repos/${config.owner}/${config.repo}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `API error ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function fetchComments() {
    const protoFolder = getPrototypeFolder();
    try {
      const issues = await apiRequest(`/issues?labels=${LABEL}&state=all&per_page=100&sort=created&direction=asc`);
      comments = issues
        .filter(issue => {
          const meta = parseIssueMeta(issue.body);
          return meta && meta.prototype === protoFolder;
        })
        .map(issue => {
          const meta = parseIssueMeta(issue.body);
          return {
            id: issue.number,
            ...meta,
            author: issue.user.login,
            avatarUrl: issue.user.avatar_url,
            body: meta.comment,
            createdAt: issue.created_at,
            resolved: issue.state === 'closed',
            replies: []
          };
        });

      // Fetch replies for visible comments
      await fetchReplies();
    } catch (e) {
      console.error('Failed to fetch comments:', e);
      comments = [];
    }
  }

  async function fetchReplies() {
    const hash = window.location.hash || '#/0/0';
    const visible = comments.filter(c => c.hash === hash);

    await Promise.all(visible.map(async (comment) => {
      try {
        const replies = await apiRequest(`/issues/${comment.id}/comments`);
        comment.replies = replies.map(r => ({
          author: r.user.login,
          avatarUrl: r.user.avatar_url,
          body: r.body,
          createdAt: r.created_at
        }));
      } catch (e) {
        comment.replies = [];
      }
    }));
  }

  function parseIssueMeta(body) {
    if (!body) return null;
    const match = body.match(/<!--\s*COMMENT_META\s*([\s\S]*?)-->/);
    if (!match) return null;
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      return null;
    }
  }

  function buildIssueBody(meta, commentText) {
    const metaJson = JSON.stringify(meta, null, 2);
    return `<!-- COMMENT_META\n${metaJson}\n-->\n\n${commentText}`;
  }

  let labelEnsured = false;

  async function ensureLabel() {
    if (labelEnsured) return;
    try {
      await apiRequest(`/labels/${LABEL}`);
      labelEnsured = true;
    } catch (e) {
      try {
        await apiRequest('/labels', {
          method: 'POST',
          body: JSON.stringify({
            name: LABEL,
            color: '1a73e8',
            description: 'Prototype feedback comments'
          })
        });
        labelEnsured = true;
      } catch (e2) {
        labelEnsured = true;
      }
    }
  }

  async function createComment(x, y, text) {
    await ensureLabel();
    const hash = window.location.hash || '#/0/0';
    const protoFolder = getPrototypeFolder();
    const meta = {
      prototype: protoFolder,
      hash: hash,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
      comment: text
    };

    const title = `[${protoFolder}] ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`;
    const body = buildIssueBody(meta, text);

    const issue = await apiRequest('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title: title,
        body: body,
        labels: [LABEL]
      })
    });

    comments.push({
      id: issue.number,
      ...meta,
      author: issue.user.login,
      avatarUrl: issue.user.avatar_url,
      body: text,
      createdAt: issue.created_at,
      resolved: false,
      replies: []
    });

    return issue.number;
  }

  async function addReply(issueNumber, text) {
    const reply = await apiRequest(`/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: text })
    });

    const comment = comments.find(c => c.id === issueNumber);
    if (comment) {
      comment.replies.push({
        author: reply.user.login,
        avatarUrl: reply.user.avatar_url,
        body: reply.body,
        createdAt: reply.created_at
      });
    }
  }

  async function resolveComment(issueNumber) {
    await apiRequest(`/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' })
    });
    const comment = comments.find(c => c.id === issueNumber);
    if (comment) comment.resolved = true;
  }

  async function reopenComment(issueNumber) {
    await apiRequest(`/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'open' })
    });
    const comment = comments.find(c => c.id === issueNumber);
    if (comment) comment.resolved = false;
  }

  async function deleteComment(issueNumber) {
    await apiRequest(`/issues/${issueNumber}/labels/${LABEL}`, {
      method: 'DELETE'
    });
    await apiRequest(`/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' })
    });
    comments = comments.filter(c => c.id !== issueNumber);
  }

  // ── Auth (GitHub Device Flow) ──

  function getClientId() {
    const cfg = window.COMMENTS_CONFIG;
    return (cfg && cfg.clientId) || '';
  }

  async function validateToken(t) {
    const config = getConfig();
    const res = await fetch(`${config.apiBase}/user`, {
      headers: {
        'Authorization': `token ${t}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function startDeviceFlow() {
    const config = getConfig();
    const baseHost = config.apiBase.replace('/api/v3', '').replace('https://', '');
    const loginBase = `https://${baseHost}`;

    const res = await fetch(`${loginBase}/login/device/code`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: getClientId(),
        scope: 'repo'
      })
    });

    if (!res.ok) throw new Error('Failed to start device flow');
    return res.json();
  }

  async function pollForToken(deviceCode, interval) {
    const config = getConfig();
    const baseHost = config.apiBase.replace('/api/v3', '').replace('https://', '');
    const loginBase = `https://${baseHost}`;

    while (true) {
      await new Promise(r => setTimeout(r, interval * 1000));

      const res = await fetch(`${loginBase}/login/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: getClientId(),
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await res.json();

      if (data.access_token) return data.access_token;
      if (data.error === 'authorization_pending') continue;
      if (data.error === 'slow_down') {
        interval += 5;
        continue;
      }
      throw new Error(data.error_description || data.error || 'Auth failed');
    }
  }

  function showAuthModal() {
    const config = getConfig();
    const baseHost = config.apiBase.replace('/api/v3', '').replace('https://', '');
    const tokenUrl = `https://${baseHost}/settings/tokens/new?scopes=repo&description=Prototype+Comments`;

    const modal = document.createElement('div');
    modal.className = 'comments-auth-modal';
    modal.innerHTML = `
      <div class="comments-auth-box">
        <h2>Sign in to comment</h2>
        <div id="comments-auth-device-view">
          <p>Click below to sign in with your GitHub account. A new tab will open where you'll enter a code to authorize.</p>
          <div class="comments-auth-device" style="display:none">
            <div class="comments-device-code" id="comments-device-code"></div>
            <p class="comments-device-hint">Enter this code on GitHub, then come back here.</p>
          </div>
          <div class="comments-auth-error" id="comments-auth-error"></div>
          <div class="comments-auth-actions">
            <button class="comment-cancel-btn" id="comments-auth-cancel">Cancel</button>
            <button class="comment-submit-btn" id="comments-auth-submit">Sign in with GitHub</button>
          </div>
        </div>
        <div id="comments-auth-pat-view" style="display:none">
          <p>Paste a <a href="${tokenUrl}" target="_blank">Personal Access Token</a> with <strong>repo</strong> scope. Your token is stored locally in this browser.</p>
          <input type="password" id="comments-pat-input" placeholder="ghp_xxxxxxxxxxxx or gho_xxxxxxxxxxxx" autocomplete="off">
          <div class="comments-auth-error" id="comments-pat-error"></div>
          <div class="comments-auth-actions">
            <button class="comment-cancel-btn" id="comments-pat-cancel">Cancel</button>
            <button class="comment-submit-btn" id="comments-pat-submit">Sign in</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const deviceView = modal.querySelector('#comments-auth-device-view');
    const patView = modal.querySelector('#comments-auth-pat-view');
    const submitBtn = modal.querySelector('#comments-auth-submit');
    const cancelBtn = modal.querySelector('#comments-auth-cancel');
    const errorEl = modal.querySelector('#comments-auth-error');
    const deviceEl = modal.querySelector('.comments-auth-device');
    const codeEl = modal.querySelector('#comments-device-code');

    const patInput = modal.querySelector('#comments-pat-input');
    const patSubmit = modal.querySelector('#comments-pat-submit');
    const patCancel = modal.querySelector('#comments-pat-cancel');
    const patError = modal.querySelector('#comments-pat-error');

    let cancelled = false;

    function showPatFallback() {
      deviceView.style.display = 'none';
      patView.style.display = 'block';
      patInput.focus();
    }

    async function handleToken(t) {
      const userData = await validateToken(t);
      if (userData) {
        token = t;
        user = userData;
        localStorage.setItem(STORAGE_KEY, t);
        modal.remove();
        activateComments();
        return true;
      }
      return false;
    }

    // Device Flow
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Starting...';
      errorEl.style.display = 'none';

      if (!getClientId()) {
        showPatFallback();
        return;
      }

      try {
        const flow = await startDeviceFlow();
        codeEl.textContent = flow.user_code;
        deviceEl.style.display = 'block';
        submitBtn.style.display = 'none';

        window.open(flow.verification_uri, '_blank');

        const accessToken = await pollForToken(flow.device_code, flow.interval || 5);
        if (cancelled) return;

        if (!(await handleToken(accessToken))) {
          throw new Error('Token validation failed');
        }
      } catch (e) {
        if (cancelled) return;
        if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
          showPatFallback();
        } else {
          errorEl.textContent = e.message || 'Authentication failed.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign in with GitHub';
          submitBtn.style.display = '';
          deviceEl.style.display = 'none';
        }
      }
    });

    // PAT fallback
    patSubmit.addEventListener('click', async () => {
      const val = patInput.value.trim();
      if (!val) return;
      patSubmit.disabled = true;
      patSubmit.textContent = 'Verifying...';
      patError.style.display = 'none';

      if (!(await handleToken(val))) {
        patError.textContent = 'Invalid token. Make sure it has repo scope.';
        patError.style.display = 'block';
        patSubmit.disabled = false;
        patSubmit.textContent = 'Sign in';
      }
    });

    patInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') patSubmit.click();
    });

    // Cancel handlers
    function cancel() {
      cancelled = true;
      modal.remove();
      deactivateComments();
    }

    cancelBtn.addEventListener('click', cancel);
    patCancel.addEventListener('click', cancel);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cancel();
    });
  }

  // ── UI ──

  function createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'proto-comment-toggle';
    btn.title = 'Toggle comments';
    btn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H5l-3 3v-3H3.5A1.5 1.5 0 012 10.5v-7z"/>
      </svg>
      <span class="proto-comment-count" style="display:none">0</span>
    `;
    btn.addEventListener('click', toggleComments);
    toggleBtn = btn;
    return btn;
  }

  function updateToggleCount() {
    if (!toggleBtn) return;
    const hash = window.location.hash || '#/0/0';
    const count = comments.filter(c => c.hash === hash && !c.resolved).length;
    const badge = toggleBtn.querySelector('.proto-comment-count');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  function toggleComments() {
    if (activeMode) {
      deactivateComments();
    } else {
      if (!token) {
        showAuthModal();
      } else {
        activateComments();
      }
    }
  }

  async function activateComments() {
    activeMode = true;
    toggleBtn.classList.add('active');

    if (!user) {
      user = await validateToken(token);
      if (!user) {
        localStorage.removeItem(STORAGE_KEY);
        token = null;
        showAuthModal();
        return;
      }
    }

    await fetchComments();
    showOverlay();
    showPanel();
    updateToggleCount();
    renderPins();
    renderPanelComments();

    const content = document.querySelector('.proto-content');
    if (content) content.classList.add('with-panel');
  }

  function deactivateComments() {
    activeMode = false;
    toggleBtn.classList.remove('active');
    selectedThread = null;

    if (overlay) overlay.classList.remove('active');
    if (panel) panel.classList.remove('open');

    const content = document.querySelector('.proto-content');
    if (content) content.classList.remove('with-panel');

    clearPins();
  }

  // ── Overlay (for placing pins) ──

  function ensureIframeWrap() {
    const content = document.querySelector('.proto-content');
    if (!content) return null;
    let wrap = content.querySelector('.comments-iframe-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'comments-iframe-wrap';
      const iframe = content.querySelector('iframe');
      if (iframe) {
        content.insertBefore(wrap, iframe);
        wrap.appendChild(iframe);
      }
    }
    return wrap;
  }

  function showOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'comments-overlay';
      const wrap = ensureIframeWrap();
      if (wrap) {
        wrap.appendChild(overlay);
      }

      overlay.addEventListener('click', handleOverlayClick);
    }
    overlay.classList.add('active');
  }

  function handleOverlayClick(e) {
    // Don't trigger if clicking on a pin or existing form
    if (e.target.closest('.comment-pin') || e.target.closest('.comment-new-form')) return;

    // Remove any existing new-comment form
    const existing = overlay.querySelector('.comment-new-form');
    if (existing) existing.remove();

    // Calculate position as percentage of overlay
    const rect = overlay.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    showNewCommentForm(x, y, e.clientX - rect.left, e.clientY - rect.top);
  }

  function showNewCommentForm(xPct, yPct, pxLeft, pxTop) {
    const form = document.createElement('div');
    form.className = 'comment-new-form';

    // Position form near click, but keep within bounds
    const formWidth = 280;
    const overlayRect = overlay.getBoundingClientRect();
    let left = pxLeft + 16;
    if (left + formWidth > overlayRect.width) {
      left = pxLeft - formWidth - 16;
    }
    form.style.left = left + 'px';
    form.style.top = Math.max(8, pxTop - 20) + 'px';

    form.innerHTML = `
      <textarea placeholder="Leave a comment..." autofocus></textarea>
      <div class="comment-new-form-actions">
        <button class="comment-cancel-btn">Cancel</button>
        <button class="comment-submit-btn">Post</button>
      </div>
    `;

    overlay.appendChild(form);

    const textarea = form.querySelector('textarea');
    const submitBtn = form.querySelector('.comment-submit-btn');
    const cancelBtn = form.querySelector('.comment-cancel-btn');

    // Show a temporary pin at the location
    const tempPin = createPinElement('?', xPct, yPct);
    tempPin.classList.add('selected');
    overlay.appendChild(tempPin);

    setTimeout(() => textarea.focus(), 50);

    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';

      try {
        await createComment(xPct, yPct, text);
        form.remove();
        tempPin.remove();
        renderPins();
        renderPanelComments();
        updateToggleCount();
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
        alert('Failed to post comment: ' + e.message);
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        submitBtn.click();
      }
    });

    cancelBtn.addEventListener('click', () => {
      form.remove();
      tempPin.remove();
    });
  }

  // ── Pins ──

  function createPinElement(label, xPct, yPct) {
    const pin = document.createElement('div');
    pin.className = 'comment-pin';
    pin.style.left = (xPct * 100) + '%';
    pin.style.top = (yPct * 100) + '%';
    pin.innerHTML = `<span>${label}</span>`;
    return pin;
  }

  function renderPins() {
    clearPins();
    if (!overlay) return;

    const hash = window.location.hash || '#/0/0';
    const visible = comments.filter(c => c.hash === hash);
    let pinIndex = 1;

    visible.forEach((comment) => {
      const pin = createPinElement(pinIndex, comment.x, comment.y);
      if (comment.resolved) pin.classList.add('resolved');
      if (selectedThread === comment.id) pin.classList.add('selected');

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedThread = comment.id;
        renderPins();
        renderPanelComments();
        scrollToThread(comment.id);
      });

      overlay.appendChild(pin);
      pinIndex++;
    });
  }

  function clearPins() {
    if (!overlay) return;
    overlay.querySelectorAll('.comment-pin').forEach(p => p.remove());
  }

  // ── Panel ──

  function showPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'comments-panel';

      panel.innerHTML = `
        <div class="comments-panel-header">
          <span class="comments-panel-title">Comments</span>
          <button class="comments-panel-close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>
        <div class="comments-panel-body"></div>
      `;

      panel.querySelector('.comments-panel-close').addEventListener('click', deactivateComments);

      const content = document.querySelector('.proto-content');
      if (content) content.appendChild(panel);
    }
    panel.classList.add('open');
  }

  function renderPanelComments() {
    if (!panel) return;
    const body = panel.querySelector('.comments-panel-body');
    const hash = window.location.hash || '#/0/0';
    const visible = comments.filter(c => c.hash === hash);

    if (visible.length === 0) {
      body.innerHTML = `
        <div class="comments-empty">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 10a4 4 0 014-4h28a4 4 0 014 4v20a4 4 0 01-4 4H16l-10 10V10z"/>
          </svg>
          <p>No comments yet.<br>Click anywhere on the prototype to leave one.</p>
        </div>
      `;
      return;
    }

    let html = '';
    let pinIndex = 1;

    visible.forEach((comment) => {
      const isSelected = selectedThread === comment.id;
      const timeStr = formatTime(comment.createdAt);

      html += `<div class="comment-thread ${isSelected ? 'selected' : ''}" data-id="${comment.id}">`;
      html += `<div class="comment-entry">`;
      html += `<div class="comment-author-row">`;
      html += `<img class="comment-avatar" src="${comment.avatarUrl}" alt="">`;
      html += `<span class="comment-author">${escapeHtml(comment.author)}</span>`;
      html += `<span class="comment-time">#${pinIndex} &middot; ${timeStr}</span>`;
      if (comment.resolved) {
        html += `<span class="comment-resolved-badge">Resolved</span>`;
      }
      html += `</div>`;
      html += `<div class="comment-body">${escapeHtml(comment.body)}</div>`;
      html += `<div class="comment-actions">`;
      if (comment.resolved) {
        html += `<button class="comment-action-btn" data-action="reopen" data-id="${comment.id}">Reopen</button>`;
      } else {
        html += `<button class="comment-action-btn" data-action="resolve" data-id="${comment.id}">Resolve</button>`;
      }
      if (user && comment.author === user.login) {
        html += `<button class="comment-action-btn comment-action-btn--danger" data-action="delete" data-id="${comment.id}">Delete</button>`;
      }
      html += `</div>`;
      html += `</div>`;

      // Replies
      (comment.replies || []).forEach((reply) => {
        const replyTime = formatTime(reply.createdAt);
        html += `<div class="comment-entry">`;
        html += `<div class="comment-author-row">`;
        html += `<img class="comment-avatar" src="${reply.avatarUrl}" alt="">`;
        html += `<span class="comment-author">${escapeHtml(reply.author)}</span>`;
        html += `<span class="comment-time">${replyTime}</span>`;
        html += `</div>`;
        html += `<div class="comment-body">${escapeHtml(reply.body)}</div>`;
        html += `</div>`;
      });

      // Reply box
      if (!comment.resolved) {
        html += `<div class="comment-reply-box">`;
        html += `<textarea class="comment-reply-input" placeholder="Reply..." data-id="${comment.id}"></textarea>`;
        html += `<div class="comment-reply-actions" style="display:none" data-reply-actions="${comment.id}">`;
        html += `<button class="comment-cancel-btn" data-reply-cancel="${comment.id}">Cancel</button>`;
        html += `<button class="comment-submit-btn" data-reply-submit="${comment.id}">Reply</button>`;
        html += `</div>`;
        html += `</div>`;
      }

      html += `</div>`;
      pinIndex++;
    });

    body.innerHTML = html;

    // Bind events
    body.querySelectorAll('[data-action="resolve"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await resolveComment(id);
        renderPins();
        renderPanelComments();
        updateToggleCount();
      });
    });

    body.querySelectorAll('[data-action="reopen"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await reopenComment(id);
        renderPins();
        renderPanelComments();
        updateToggleCount();
      });
    });

    body.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this comment?')) return;
        const id = parseInt(e.target.dataset.id);
        await deleteComment(id);
        if (selectedThread === id) selectedThread = null;
        renderPins();
        renderPanelComments();
        updateToggleCount();
      });
    });

    body.querySelectorAll('.comment-reply-input').forEach(textarea => {
      textarea.addEventListener('focus', () => {
        const id = textarea.dataset.id;
        const actions = body.querySelector(`[data-reply-actions="${id}"]`);
        if (actions) actions.style.display = 'flex';
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          const id = textarea.dataset.id;
          const submitBtn = body.querySelector(`[data-reply-submit="${id}"]`);
          if (submitBtn) submitBtn.click();
        }
      });
    });

    body.querySelectorAll('[data-reply-cancel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.replyCancel;
        const textarea = body.querySelector(`.comment-reply-input[data-id="${id}"]`);
        const actions = body.querySelector(`[data-reply-actions="${id}"]`);
        if (textarea) textarea.value = '';
        if (actions) actions.style.display = 'none';
      });
    });

    body.querySelectorAll('[data-reply-submit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.replySubmit);
        const textarea = body.querySelector(`.comment-reply-input[data-id="${id}"]`);
        const text = textarea.value.trim();
        if (!text) return;

        btn.disabled = true;
        btn.textContent = 'Posting...';

        try {
          await addReply(id, text);
          renderPanelComments();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = 'Reply';
          alert('Failed to post reply: ' + e.message);
        }
      });
    });

    // Click on thread to select
    body.querySelectorAll('.comment-thread').forEach(thread => {
      thread.addEventListener('click', (e) => {
        if (e.target.closest('textarea, button')) return;
        const id = parseInt(thread.dataset.id);
        selectedThread = id;
        renderPins();
        renderPanelComments();
      });
    });
  }

  function scrollToThread(id) {
    if (!panel) return;
    const thread = panel.querySelector(`.comment-thread[data-id="${id}"]`);
    if (thread) {
      thread.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // ── Helpers ──

  function formatTime(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHrs < 24) return diffHrs + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ──

  function injectStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = getBasePath() + 'shared/comments.css';
    document.head.appendChild(link);
  }

  function getBasePath() {
    const scripts = document.querySelectorAll('script[src*="comments.js"]');
    if (scripts.length) {
      const src = scripts[0].getAttribute('src');
      // src is "../shared/comments.js" — strip "shared/comments.js" to get "../"
      return src.replace('shared/comments.js', '');
    }
    return '../';
  }

  function mount() {
    injectStyles();

    // Wait for the chrome to build, then inject the toggle button
    const checkChrome = setInterval(() => {
      const row1 = document.querySelector('.proto-header-row');
      const backLink = document.querySelector('.proto-back');
      if (row1 && backLink) {
        clearInterval(checkChrome);
        const btn = createToggleButton();
        backLink.parentNode.insertBefore(btn, backLink);

        // If token exists, validate silently and show count
        if (token) {
          validateToken(token).then(userData => {
            if (userData) {
              user = userData;
              fetchComments().then(() => updateToggleCount());
            } else {
              localStorage.removeItem(STORAGE_KEY);
              token = null;
            }
          });
        }

        // Re-render pins when hash changes (switching options)
        window.addEventListener('hashchange', () => {
          if (activeMode) {
            fetchComments().then(() => {
              renderPins();
              renderPanelComments();
              updateToggleCount();
            });
          } else if (token && user) {
            fetchComments().then(() => updateToggleCount());
          }
        });
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Expose for external use
  window.ProtoComments = {
    activate: activateComments,
    deactivate: deactivateComments,
    setConfig: (cfg) => { window.COMMENTS_CONFIG = cfg; }
  };
})();
