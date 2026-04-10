(function () {
  const STORAGE_KEY = 'bac.examProgress.v1';

  function normalizePdfPath(path) {
    if (!path) return '';
    const [withoutHash] = path.split('#');
    const [withoutQuery] = withoutHash.split('?');
    return withoutQuery.replace(/^\/+/, '').replace(/\\/g, '/');
  }

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
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

  function markDone(path) {
    const normalizedPath = normalizePdfPath(path);
    if (!normalizedPath) return;

    const store = readStore();
    store[normalizedPath] = true;

    const correctionPath = getLinkedCorrectionPath(normalizedPath);
    if (correctionPath) {
      store[correctionPath] = true;
    }

    writeStore(store);
  }

  function getPdfPathFromHref(href) {
    try {
      const url = new URL(href, window.location.href);
      return normalizePdfPath(decodeURIComponent(url.searchParams.get('pdf') || ''));
    } catch {
      return '';
    }
  }

  function enhanceExamListPage() {
    const examLinks = Array.from(document.querySelectorAll('.exam-list .exam-row a[href*="view-pdf.html?pdf="]'));
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

    if (pageWrap) {
      if (heading && heading.parentNode === pageWrap) {
        heading.insertAdjacentElement('afterend', progressWrap);
      } else {
        pageWrap.prepend(progressWrap);
      }
    }

    const entries = examLinks.map((link) => {
      const path = getPdfPathFromHref(link.href);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button-mini exam-done-button';
      button.textContent = 'Marquer terminé';

      button.addEventListener('click', (event) => {
        event.preventDefault();
        markDone(path);
        refresh();
      });

      link.insertAdjacentElement('afterend', button);
      return { link, path, button };
    });

    function refresh() {
      let doneCount = 0;

      entries.forEach(({ link, path, button }) => {
        const done = isDone(path);
        link.classList.toggle('exam-link-done', done);
        button.classList.toggle('exam-done', done);
        button.textContent = done ? 'Terminé ✓' : 'Marquer terminé';
        button.disabled = done;

        if (done) doneCount += 1;
      });

      const total = entries.length;
      const percentage = total ? Math.round((doneCount / total) * 100) : 0;
      const fill = progressWrap.querySelector('.exam-progress-fill');
      const label = progressWrap.querySelector('.exam-progress-label');
      const track = progressWrap.querySelector('.exam-progress-track');

      fill.style.width = `${percentage}%`;
      label.textContent = `${percentage}% (${doneCount}/${total})`;
      track.setAttribute('aria-valuenow', String(percentage));
    }

    refresh();
    window.addEventListener('storage', refresh);
  }

  function enhancePdfViewerPage() {
    const rawPdf = new URLSearchParams(window.location.search).get('pdf') || '';
    if (!rawPdf) return;

    let pdfPath = rawPdf;
    try {
      pdfPath = decodeURIComponent(rawPdf);
    } catch {
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
      doneBtn.disabled = done;

      if (done && status && status.textContent && !status.textContent.includes('• Terminé')) {
        status.textContent = `${status.textContent} • Terminé`;
      }
    }

    doneBtn.addEventListener('click', () => {
      markDone(pdfPath);
      refresh();
    });

    actions.appendChild(doneBtn);
    refresh();
    window.addEventListener('storage', refresh);
  }

  enhanceExamListPage();
  enhancePdfViewerPage();
})();
