(function () {
  const STORAGE_KEY = 'bac.examProgress.v1';
  const THEME_KEY = 'bac.theme.choice';
  const THEMES = ['theme-bleu', 'theme-clair', 'theme-vert', 'theme-rose', 'theme-banana', 'theme-cotton', 'theme-noir', 'theme-gold', 'theme-peach', 'theme-lavande', 'theme-pistache', 'theme-sunset', 'theme-bubble', 'theme-sorbet', 'theme-grape'];
  const DEFAULT_THEME = 'theme-bleu';

  function normalizePdfPath(path) {
    if (!path) return '';
    const [withoutHash] = path.split('#');
    const [withoutQuery] = withoutHash.split('?');
    return withoutQuery.replace(/^\/+/, '').replace(/\\/g, '/');
  }

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }
    catch {
      return {};
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getLinkedCorrectionPath(path) {
    const normalizedPath = normalizePdfPath(path);
    const subjectMatch = normalizedPath.match(/^(.*\/)(Sujet)(\d{4})(\.pdf)$/i);
    if (!subjectMatch) return '';
    return `${subjectMatch[1]}Corr${subjectMatch[3]}${subjectMatch[4]}`;
  }

  function isDone(path) {
    const store = readStore();
    return Boolean(store[normalizePdfPath(path)]);
  }

  function setDone(path, done) {
    const normalizedPath = normalizePdfPath(path);
    if (!normalizedPath) return;

    const store = readStore();
    if (done) {
      store[normalizedPath] = true;
    }
    else {
      delete store[normalizedPath];
    }

    const correctionPath = getLinkedCorrectionPath(normalizedPath);
    if (correctionPath) {
      if (done) {
        store[correctionPath] = true;
      }
      else {
        delete store[correctionPath];
      }
    }

    writeStore(store);
  }

  function toggleDone(path) {
    const done = isDone(path);
    setDone(path, !done);
  }

  function getPdfPathFromHref(href) {
    try {
      const url = new URL(href, window.location.href);
      return normalizePdfPath(decodeURIComponent(url.searchParams.get('pdf') || ''));
    }
    catch {
      return '';
    }
  }

  function isSubjectPdfPath(path) {
    return /\/Sujet\d{4}\.pdf$/i.test(normalizePdfPath(path));
  }

  function buildProgressData(paths) {
    const total = paths.length;
    let doneCount = 0;

    paths.forEach((path) => {
      if (isDone(path)) doneCount += 1;
    });

    const percentage = total ? Math.round((doneCount / total) * 100) : 0;
    return { doneCount, total, percentage };
  }

  function applyTheme(themeName) {
    const nextTheme = THEMES.includes(themeName) ? themeName : DEFAULT_THEME;
    document.body.classList.remove(...THEMES);
    document.body.classList.add(nextTheme);
    return nextTheme;
  }

  function readThemeChoice() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored;
    }
    catch {
      // Fallback to cookie if localStorage is unavailable.
    }

    try {
      const cookieValue = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${THEME_KEY}=`));
      if (!cookieValue) return '';
      return decodeURIComponent(cookieValue.slice(THEME_KEY.length + 1));
    }
    catch {
      return '';
    }
  }

  function writeThemeChoice(themeName) {
    try {
      localStorage.setItem(THEME_KEY, themeName);
    }
    catch {
      // Keep going, cookie fallback below will persist the theme.
    }

    try {
      document.cookie = `${THEME_KEY}=${encodeURIComponent(themeName)}; path=/; max-age=31536000; SameSite=Lax`;
    }
    catch {
      // Ignore if cookies are disabled.
    }
  }



  function ensureThemeMenu() {
    if (document.getElementById('theme-toggle') || !document.body) return;

    const menu = document.createElement('div');
    menu.className = 'theme-menu';
    menu.setAttribute('aria-label', 'Choix du thème');
    menu.innerHTML = `
      <button type="button" id="theme-toggle" class="theme-toggle" aria-expanded="false" aria-controls="theme-options">Thèmes</button>
      <div id="theme-options" class="theme-options" aria-hidden="true">
        <button type="button" class="theme-swatch" data-theme="theme-bleu" aria-label="Thème Bleu"></button>
        <button type="button" class="theme-swatch" data-theme="theme-clair" aria-label="Thème Clair"></button>
        <button type="button" class="theme-swatch" data-theme="theme-vert" aria-label="Thème Vert"></button>
        <button type="button" class="theme-swatch" data-theme="theme-rose" aria-label="Thème Rose"></button>
        <button type="button" class="theme-swatch" data-theme="theme-banana" aria-label="Thème Banane"></button>
        <button type="button" class="theme-swatch" data-theme="theme-cotton" aria-label="Thème Pastel bleu"></button>
        <button type="button" class="theme-swatch" data-theme="theme-noir" aria-label="Thème Noir"></button>
        <button type="button" class="theme-swatch" data-theme="theme-gold" aria-label="Thème Doré"></button>
        <button type="button" class="theme-swatch" data-theme="theme-peach" aria-label="Thème Pêche"></button>
        <button type="button" class="theme-swatch" data-theme="theme-lavande" aria-label="Thème Lavande"></button>
        <button type="button" class="theme-swatch" data-theme="theme-pistache" aria-label="Thème Pistache"></button>
        <button type="button" class="theme-swatch" data-theme="theme-sunset" aria-label="Thème Sunset"></button>
        <button type="button" class="theme-swatch" data-theme="theme-bubble" aria-label="Thème Bubblegum"></button>
        <button type="button" class="theme-swatch" data-theme="theme-sorbet" aria-label="Thème Sorbet"></button>
        <button type="button" class="theme-swatch" data-theme="theme-grape" aria-label="Thème Grape"></button>
      </div>
    `;

    document.body.prepend(menu);
  }

  function initGlobalTheme() {
    const savedTheme = readThemeChoice() || DEFAULT_THEME;

    const swatches = Array.from(document.querySelectorAll('.theme-swatch[data-theme]'));
    const toggle = document.getElementById('theme-toggle');
    const options = document.getElementById('theme-options');

    function syncThemeControls(activeTheme) {
      swatches.forEach((swatch) => {
        const isActive = swatch.dataset.theme === activeTheme;
        swatch.classList.toggle('is-active', isActive);
        swatch.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function setTheme(themeName, persist = true) {
      const next = applyTheme(themeName);
      syncThemeControls(next);
      if (persist) writeThemeChoice(next);
      return next;
    }

    setTheme(savedTheme, false);

    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        setTheme(swatch.dataset.theme || DEFAULT_THEME);
      });
    });

    if (toggle && options) {
      options.setAttribute('aria-hidden', 'true');

      function closeThemeOptions() {
        options.classList.remove('is-open');
        options.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      }

      function openThemeOptions() {
        options.classList.add('is-open');
        options.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
      }

      toggle.addEventListener('click', () => {
        const isOpen = options.classList.contains('is-open');
        if (isOpen) closeThemeOptions();
        else openThemeOptions();
      });

      document.addEventListener('click', (event) => {
        if (!options.contains(event.target) && event.target !== toggle) {
          closeThemeOptions();
        }
      });

      swatches.forEach((swatch) => {
        swatch.addEventListener('click', closeThemeOptions);
      });
    }

    window.addEventListener('storage', (event) => {
      if (event.key === THEME_KEY) {
        setTheme(event.newValue || DEFAULT_THEME, false);
      }
    });
  }


  function enhanceExamListPage() {
    const examLinks = Array.from(document.querySelectorAll('a[href*="view-pdf.html?pdf="]')).filter((link) => {
      const path = getPdfPathFromHref(link.href);
      return isSubjectPdfPath(path);
    });
    if (!examLinks.length) return;

    const pageWrap = document.querySelector('.page-wrap');
    const heading = document.querySelector('.exam-heading');

    const progressWrap = document.createElement('div');
    progressWrap.className = 'exam-progress';
    progressWrap.innerHTML = `
      <div class="exam-progress-top">
        <strong>Progression</strong>
        <span class="exam-progress-label">0%</span>
      </div>
      <div class="exam-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="exam-progress-fill"></div>
      </div>
    `;

    const progressContainer = pageWrap || document.body;
    if (heading && heading.parentNode === progressContainer) {
      heading.insertAdjacentElement('afterend', progressWrap);
    }
    else {
      progressContainer.prepend(progressWrap);
    }

    const entries = examLinks.map((link) => {
      const path = getPdfPathFromHref(link.href);
      const line = link.closest('.exam-row') || link.parentElement;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'exam-check-toggle';
      toggle.setAttribute('aria-label', 'Basculer terminé');

      if (line && line.firstElementChild !== toggle) {
        line.insertBefore(toggle, line.firstChild);
      }
      else {
        link.insertAdjacentElement('beforebegin', toggle);
      }

      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleDone(path);
        refresh();
      });

      return { link, path, toggle };
    });

    function refresh() {
      const progress = buildProgressData(entries.map((entry) => entry.path));

      entries.forEach(({ link, path, toggle }) => {
        const done = isDone(path);
        link.classList.toggle('exam-link-done', done);
        toggle.classList.toggle('is-done', done);
        toggle.setAttribute('aria-pressed', done ? 'true' : 'false');
        toggle.textContent = done ? '✓' : '';
      });

      const fill = progressWrap.querySelector('.exam-progress-fill');
      const label = progressWrap.querySelector('.exam-progress-label');
      const track = progressWrap.querySelector('.exam-progress-track');

      fill.style.width = `${progress.percentage}%`;
      label.textContent = `${progress.percentage}% (${progress.doneCount}/${progress.total})`;
      track.setAttribute('aria-valuenow', String(progress.percentage));
    }

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
  }

  function extractSubjectPathsFromDocument(doc, baseUrl) {
    const subjectLinks = Array.from(doc.querySelectorAll('a[href*="view-pdf.html?pdf="]'));
    return subjectLinks
      .map((link) => {
        try {
          const absolute = new URL(link.getAttribute('href') || '', baseUrl).href;
          return getPdfPathFromHref(absolute);
        }
        catch {
          return '';
        }
      })
      .filter((path) => isSubjectPdfPath(path));
  }

  async function buildProgressBadgeForLink(link) {
    const href = link.getAttribute('href');
    if (!href) return;

    const looksLikeTrackableLink = /\.html?(?:$|[?#])/i.test(href) && !/view-pdf\.html/i.test(href);
    if (!looksLikeTrackableLink) return;

    let targetUrl;
    try {
      targetUrl = new URL(href, window.location.href);
    }
    catch {
      return;
    }

    try {
      const response = await fetch(targetUrl.href, { credentials: 'same-origin' });
      if (!response.ok) return;
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const subjectPaths = extractSubjectPathsFromDocument(doc, targetUrl.href);
      if (!subjectPaths.length) return;

      const progress = buildProgressData(subjectPaths);

      const badge = document.createElement('span');
      badge.className = 'session-progress-badge';
      badge.style.setProperty('--progress', `${progress.percentage}%`);
      badge.title = `${progress.doneCount}/${progress.total} terminés`;

      link.classList.add('session-progress-link');
      link.prepend(badge);
    }
    catch {
      // Ignore silent failure so this doesn't break navigation pages.
    }
  }

  function enhanceSessionProgressLinks() {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const uniqueLinks = links.filter((link) => !link.querySelector('.session-progress-badge'));
    if (!uniqueLinks.length) return;

    Promise.all(uniqueLinks.map((link) => buildProgressBadgeForLink(link)));
  }



  function parseTargetFromOnclick(onclickValue) {
    if (!onclickValue) return '';
    const match = onclickValue.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : '';
  }

  async function getProgressForTarget(target) {
    if (!target) return null;

    const pdfPath = getPdfPathFromHref(target);
    if (pdfPath && isSubjectPdfPath(pdfPath)) {
      const done = isDone(pdfPath) ? 1 : 0;
      return { doneCount: done, total: 1, percentage: done ? 100 : 0 };
    }

    if (!/\.html?(?:$|[?#])/i.test(target) || /view-pdf\.html/i.test(target)) return null;

    let targetUrl;
    try {
      targetUrl = new URL(target, window.location.href);
    }
    catch {
      return null;
    }

    try {
      const response = await fetch(targetUrl.href, { credentials: 'same-origin' });
      if (!response.ok) return null;
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const subjectPaths = extractSubjectPathsFromDocument(doc, targetUrl.href);
      if (!subjectPaths.length) return null;
      return buildProgressData(subjectPaths);
    }
    catch {
      return null;
    }
  }

  function attachButtonProgress(button, percentage) {
    if (!button || button.querySelector('.button-progress-track')) return;
    button.classList.add('has-button-progress');

    const track = document.createElement('span');
    track.className = 'button-progress-track';
    const fill = document.createElement('span');
    fill.className = 'button-progress-fill';
    fill.style.setProperty('--progress', `${percentage}%`);
    track.appendChild(fill);
    button.appendChild(track);
  }

  async function enhanceAllButtonsWithProgress() {
    const anchors = Array.from(document.querySelectorAll('a.button[href]'));
    const actionButtons = Array.from(document.querySelectorAll('button.index-enter-button[onclick]'));

    await Promise.all(anchors.map(async (anchor) => {
      const progress = await getProgressForTarget(anchor.getAttribute('href') || '');
      if (!progress) return;
      attachButtonProgress(anchor, progress.percentage);
      anchor.title = `${progress.doneCount}/${progress.total} terminés`;
    }));

    await Promise.all(actionButtons.map(async (button) => {
      const progress = await getProgressForTarget(parseTargetFromOnclick(button.getAttribute('onclick') || ''));
      if (!progress) return;
      attachButtonProgress(button, progress.percentage);
      button.title = `${progress.doneCount}/${progress.total} terminés`;
    }));
  }

  function enhancePdfViewerPage() {
    const rawPdf = new URLSearchParams(window.location.search).get('pdf') || '';
    if (!rawPdf) return;

    let pdfPath = rawPdf;
    try {
      pdfPath = decodeURIComponent(rawPdf);
    }
    catch {
      pdfPath = rawPdf;
    }
    pdfPath = normalizePdfPath(pdfPath);

    if (!pdfPath) return;

    const actions = document.querySelector('.pdf-toolbar-actions');
    const status = document.getElementById('pdf-status');
    if (!actions) return;

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'button-mini exam-done-button';

    function refresh() {
      const done = isDone(pdfPath);
      doneBtn.classList.toggle('exam-done', done);
      doneBtn.textContent = done ? 'Terminé ✓' : 'Marquer terminé';

      if (done && status && status.textContent && !status.textContent.includes('• Terminé')) {
        status.textContent = `${status.textContent} • Terminé`;
      }
    }

    doneBtn.addEventListener('click', () => {
      toggleDone(pdfPath);
      refresh();
    });

    actions.appendChild(doneBtn);
    refresh();
    window.addEventListener('storage', refresh);
  }

  ensureThemeMenu();
  initGlobalTheme();
  enhanceExamListPage();
  enhanceSessionProgressLinks();
  enhancePdfViewerPage();
  enhanceAllButtonsWithProgress();
})();
