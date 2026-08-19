let i18n = {};
let currentLang = 'ru';

async function loadI18n() {
  const res = await fetch('i18n.json');
  i18n = await res.json();
  applyLang('ru');
}

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = i18n[lang][key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
  });
  buildTicker(lang);
  const bgType = document.getElementById('heroBgType');
  if (bgType) bgType.textContent = lang === 'ru' ? 'РАЗРАБОТКА' : 'FULLSTACK';
}

document.querySelectorAll('[data-lang-btn]').forEach(btn => {
  btn.addEventListener('click', () => applyLang(btn.getAttribute('data-lang-btn')));
});

function buildTicker(lang) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = i18n[lang].ticker;
  const html = items.map(t => `<span>${t}</span>`).join('');
  track.innerHTML = html + html;
}

function smoothScrollTo(targetY, duration) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 1) return;
  let startTime = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + diff * easeInOutCubic(progress));
    if (elapsed < duration) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.addEventListener('click', function (e) {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href === '#') return;
  const target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  const masthead = document.querySelector('.masthead');
  const offset = masthead ? masthead.offsetHeight : 0;
  const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
  smoothScrollTo(targetY, 700);
});

const progressEl = document.getElementById('progress');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = window.scrollY / (h.scrollHeight - h.clientHeight) * 100;
  if (progressEl) progressEl.style.width = scrolled + '%';
}, { passive: true });

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

(function buildBarcode() {
  const bc = document.getElementById('barcode');
  if (!bc) return;
  let html = '';
  for (let i = 0; i < 40; i++) {
    const w = Math.random() > 0.7 ? 3 : 1;
    const h = 14 + Math.random() * 20;
    html += `<div style="width:${w}px;height:${h}px;"></div>`;
  }
  bc.innerHTML = html;
})();

async function fetchGitHubRepos() {
  const username = 'lifeofcapo';
  const loadingEl = document.getElementById('loading-projects');
  const gridEl = document.getElementById('projects-grid');

  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=20`);
    if (!response.ok) throw new Error('Failed to fetch repositories');
    const repos = await response.json();

    const excludedRepos = ['lifeofcapo', 'lifeofcapo.github.io'];
    const filteredRepos = repos.filter(r => !r.fork && !excludedRepos.includes(r.name.toLowerCase()));

    if (filteredRepos.length === 0) {
      if (loadingEl) loadingEl.textContent = i18n[currentLang]['projects.empty'];
      return;
    }

    if (loadingEl) loadingEl.style.display = 'none';

    filteredRepos.forEach((repo, idx) => {
      const row = document.createElement('div');
      row.className = 'project-row';

      const description = repo.description || '—';
      const topics = repo.topics || [];
      let tagsHTML = '';
      if (topics.length > 0) {
        tagsHTML = topics.slice(0, 4).map(t => `<span>${t}</span>`).join('');
      } else if (repo.language) {
        tagsHTML = `<span>${repo.language}</span>`;
      }

      let statsHTML = '';
      if (repo.stargazers_count > 0 || repo.forks_count > 0) {
        const starPart = repo.stargazers_count > 0
          ? `<div class="stat-item stat-star"><span class="stat-icon">★</span>${repo.stargazers_count}</div>`
          : '';
        const forkPart = repo.forks_count > 0
          ? `<div class="stat-item stat-fork"><span class="stat-icon">⑂</span>${repo.forks_count}</div>`
          : '';
        statsHTML = `<div class="project-stats">${starPart}${forkPart}</div>`;
      }

      row.innerHTML = `
        <div class="project-num">${String(idx + 1).padStart(2, '0')}</div>
        <div class="project-main">
          <div class="project-name">${repo.name}</div>
          <div class="project-desc">${description}</div>
        </div>
        <div class="project-tags">${tagsHTML}</div>
        ${statsHTML}
      `;

      row.addEventListener('click', () => window.open(repo.html_url, '_blank'));
      gridEl.appendChild(row);
    });

  } catch (error) {
    console.error('Error fetching repos:', error);
    if (loadingEl) loadingEl.textContent = i18n[currentLang]['projects.error'];
  }
}

async function fetchGitHubActivity() {
  const username = 'lifeofcapo';
  const loadingEl = document.getElementById('loading-activity');
  const gridEl = document.getElementById('activity-grid');

  try {
    const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
    if (!response.ok) throw new Error('Failed to fetch activity');
    const data = await response.json();
    if (loadingEl) loadingEl.style.display = 'none';

    data.contributions.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'activity-cell';
      let level = 0;
      if (day.count > 0) level = 1;
      if (day.count >= 3) level = 2;
      if (day.count >= 6) level = 3;
      if (day.count >= 10) level = 4;
      cell.setAttribute('data-level', level);
      cell.title = `${day.date}: ${day.count}`;
      gridEl.appendChild(cell);
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    if (loadingEl) loadingEl.textContent = i18n[currentLang]['activity.error'];
  }
}

loadI18n().then(() => {
  fetchGitHubRepos();
  fetchGitHubActivity();
});

(function initMobileMenu() {
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (!navToggle || !mobileMenu) return;
  

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
  
  document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('open') && 
        !mobileMenu.contains(e.target) && 
        !navToggle.contains(e.target)) {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
  
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && mobileMenu.classList.contains('open')) {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
})();