(function () {
  const STORAGE_KEY = 'bac.examProgress.v1';
  const THEME_KEY = 'bac.theme.choice';
  const THEMES = ['theme-bleu', 'theme-violet', 'theme-clair', 'theme-vert', 'theme-rose'];
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

  function initGlobalTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    const activeTheme = applyTheme(savedTheme);
    const select = document.getElementById('theme-select');

    if (select) {
      select.value = activeTheme;
      select.addEventListener('change', () => {
        const next = applyTheme(select.value);
        localStorage.setItem(THEME_KEY, next);
      });
    }

    window.addEventListener('storage', (event) => {
      if (event.key === THEME_KEY) {
        const syncedTheme = applyTheme(event.newValue || DEFAULT_THEME);
        if (select) select.value = syncedTheme;
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
      badge.textContent = `${progress.percentage}%`;
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

  initGlobalTheme();
  enhanceExamListPage();
  enhanceSessionProgressLinks();
  enhancePdfViewerPage();
})();
