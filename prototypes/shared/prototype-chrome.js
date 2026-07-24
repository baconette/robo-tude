/**
 * Prototype Chrome — shared header for all prototypes.
 *
 * Reads meta.json from the same directory, renders a navigation header,
 * and loads option files in an iframe. State is stored in the URL hash
 * so links are shareable.
 *
 * Hash format: #/{iteration-index}/{option-index}
 * Example:     #/1/2  → second iteration, second option
 */
(function () {
  'use strict';

  let config = null;

  async function init() {
    try {
      const res = await fetch('meta.json?v=' + Date.now());
      config = await res.json();
    } catch (e) {
      document.body.textContent = 'Could not load meta.json';
      return;
    }

    buildChrome();
    applyHashState();
    window.addEventListener('hashchange', applyHashState);
  }

  function buildChrome() {
    const root = document.createElement('div');
    root.className = 'proto-chrome';

    const header = document.createElement('div');
    header.className = 'proto-header';

    // ── Row 1: name + iteration picker ──
    const row1 = document.createElement('div');
    row1.className = 'proto-header-row';

    const nameEl = document.createElement('a');
    nameEl.className = 'proto-name';
    nameEl.textContent = config.name || 'Prototype';
    nameEl.href = '../';
    nameEl.title = 'Back to all prototypes';
    row1.appendChild(nameEl);

    const iterations = config.iterations || [];

    if (iterations.length > 1) {
      row1.appendChild(makeSeparator());

      const iterLabel = document.createElement('span');
      iterLabel.className = 'proto-label';
      iterLabel.textContent = config.iterationLabel || 'Iteration';
      row1.appendChild(iterLabel);

      const iterPills = document.createElement('div');
      iterPills.className = 'proto-pills';
      iterPills.id = 'proto-iter-pills';
      iterations.forEach(function (iter, i) {
        const btn = document.createElement('button');
        btn.className = 'proto-pill';
        btn.textContent = iter.label;
        btn.dataset.index = i;
        btn.addEventListener('click', function () {
          navigateTo(i, 0);
        });
        iterPills.appendChild(btn);
      });
      row1.appendChild(iterPills);
    }

    // Back link
    const backLink = document.createElement('a');
    backLink.className = 'proto-back';
    backLink.href = '../';
    backLink.textContent = 'All prototypes';
    row1.appendChild(backLink);

    header.appendChild(row1);

    // ── Row 2: option picker (built dynamically) ──
    const row2 = document.createElement('div');
    row2.className = 'proto-header-row';
    row2.id = 'proto-option-row';
    row2.style.display = 'none';
    header.appendChild(row2);

    root.appendChild(header);

    // ── Content iframe ──
    const content = document.createElement('div');
    content.className = 'proto-content';
    const iframe = document.createElement('iframe');
    iframe.id = 'proto-iframe';
    content.appendChild(iframe);
    root.appendChild(content);

    document.body.innerHTML = '';
    document.body.appendChild(root);
  }

  function buildOptionRow(iterIndex) {
    const row = document.getElementById('proto-option-row');
    const iterations = config.iterations || [];
    const options = (iterations[iterIndex] || iterations[0] || {}).options || [];

    row.innerHTML = '';

    if (options.length <= 1) {
      row.style.display = 'none';
      return;
    }

    row.style.display = 'flex';

    const optLabel = document.createElement('span');
    optLabel.className = 'proto-label';
    optLabel.textContent = 'Option';
    row.appendChild(optLabel);

    const optPills = document.createElement('div');
    optPills.className = 'proto-pills';
    optPills.id = 'proto-opt-pills';
    options.forEach(function (opt, i) {
      const btn = document.createElement('button');
      btn.className = 'proto-pill';
      btn.textContent = opt.label || String(i + 1);
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        navigateTo(iterIndex, i);
      });
      optPills.appendChild(btn);
    });
    row.appendChild(optPills);

    // Description
    const desc = document.createElement('span');
    desc.className = 'proto-option-desc';
    desc.id = 'proto-opt-desc';
    row.appendChild(makeSeparator());
    row.appendChild(desc);
  }

  function makeSeparator() {
    const sep = document.createElement('div');
    sep.className = 'proto-separator';
    return sep;
  }

  function navigateTo(iterIndex, optIndex) {
    window.location.hash = '#/' + iterIndex + '/' + optIndex;
  }

  function applyHashState() {
    const iterations = config.iterations || [];
    if (iterations.length === 0) return;

    // Parse hash
    var parts = window.location.hash.replace('#/', '').split('/');
    var iterIndex = parseInt(parts[0], 10) || 0;
    var optIndex = parseInt(parts[1], 10) || 0;

    // Clamp
    iterIndex = Math.max(0, Math.min(iterIndex, iterations.length - 1));
    var options = iterations[iterIndex].options || [];
    optIndex = Math.max(0, Math.min(optIndex, options.length - 1));

    // Update iteration pills
    var iterPills = document.querySelectorAll('#proto-iter-pills .proto-pill');
    iterPills.forEach(function (pill) {
      pill.classList.toggle('active', parseInt(pill.dataset.index, 10) === iterIndex);
    });

    // Rebuild option row for this iteration
    buildOptionRow(iterIndex);

    // Update option pills
    var optPills = document.querySelectorAll('#proto-opt-pills .proto-pill');
    optPills.forEach(function (pill) {
      pill.classList.toggle('active', parseInt(pill.dataset.index, 10) === optIndex);
    });

    // Update description
    var descEl = document.getElementById('proto-opt-desc');
    if (descEl && options[optIndex]) {
      descEl.textContent = options[optIndex].description || '';
    }

    // Load content
    var file = options[optIndex] ? options[optIndex].file : '';
    var iframe = document.getElementById('proto-iframe');
    var cacheBust = file ? file + (file.includes('?') ? '&' : '?') + 'v=' + Date.now() : '';
    if (file && iframe.getAttribute('src') !== cacheBust) {
      iframe.src = cacheBust;
    }
  }

  // Handle single-option prototypes (no iterations wrapper)
  // If meta.json has "options" at top level instead of "iterations"
  function normalizeConfig() {
    if (!config.iterations && config.options) {
      config.iterations = [{
        label: 'v1',
        options: config.options
      }];
    }
    // If no iterations or options, create a single entry pointing to the only file
    if (!config.iterations || config.iterations.length === 0) {
      config.iterations = [{
        label: 'v1',
        options: [{ file: 'option-1.html', label: '1', description: '' }]
      }];
    }
  }

  async function start() {
    await init();
    if (config) {
      normalizeConfig();
      buildChrome();
      applyHashState();
    }
  }

  function loadComments() {
    var script = document.createElement('script');
    script.src = '../shared/comments.js';
    document.body.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      start().then(loadComments);
    });
  } else {
    start().then(loadComments);
  }
})();
