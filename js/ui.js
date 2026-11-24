// Drawer panels, hotspot markers, tooltip and the text-only version.
import { profile, certificates, projects, workbench, articles } from './data.js';
import * as sound from './sound.js';
import { createChat } from './chat.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem('room.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('room.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const linkOf = (label) => profile.links.find((l) => l.label === label)?.url;

// Hidden things to find in the room.
const SECRETS = [
  { id: 'cat', name: 'Commit the cat', hint: 'Something furry patrols the floor.' },
  { id: 'music', name: 'Lo-fi record player', hint: 'A record is waiting by the green wall.' },
  { id: 'phone', name: 'Buzzing phone', hint: 'Something on the desk keeps buzzing.' },
  { id: 'resume', name: 'Résumé clipboard', hint: 'A clipboard hangs under the neon sign.' },
  { id: 'lanyard', name: 'Event passes', hint: 'Lanyards hang at the end of the certificate wall.' },
  { id: 'duck', name: 'Rubber duck', hint: 'Every developer’s best listener sits on the desk.' },
  { id: 'plant', name: 'Thirsty plant', hint: 'The big plant in the corner looks dry.' },
  { id: 'window', name: 'Day / night window', hint: 'Try the window.' },
  { id: 'lamp', name: 'Desk lamp switch', hint: 'Desk lamps have switches.' },
];
const DUCK_LINES = [
  'Honest numbers, documented gaps, owned mistakes.',
  'Report the weak result as-is: r ≈ −0.13 is still a finding.',
  'Data should lead to a decision, not another dashboard.',
  'Test the assumption before you trust the chart.',
  'The best analysis is useless if the team can’t use it.',
  'Turn complexity into something simple enough to act on.',
];
const POP_KINDS = ['cat', 'music', 'phone', 'resume', 'lanyard', 'duck', 'plant'];
const DRAWER_KIND = { cert: 'cert', project: 'project', build: 'build', article: 'article', avatar: 'about', contact: 'contact', skills: 'about', projects: 'projects', articles: 'articles' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ext = (href, label, cls = 'btn') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} ${icon('ext')}</a>`;

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  cube: '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  ext: '<path d="M7 17 17 7M7 7h10v10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 3.5-2 3.5 2-1.5-8"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m9 21 2-6 3 3v3M10 12l1-4 3 2 3 1M8 10l3-2"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
  shrink: '<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/>',
};
export function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

const SECTIONS = {
  about: { label: 'About', icon: 'user', room: 'avatar' },
  certs: { label: 'Certificates', icon: 'award', room: 'certs' },
  projects: { label: 'Projects', icon: 'layers', room: 'shelf' },
  articles: { label: 'Articles', icon: 'pen', room: 'desk' },
  contact: { label: 'Contact', icon: 'mail', room: 'contact' },
  secrets: { label: 'Room secrets', icon: 'spark', room: 'overview' },
};
// detail views -> their section + room object kind
const DETAIL = {
  cert: { section: 'certs', kind: 'cert', list: certificates },
  project: { section: 'projects', kind: 'project', list: projects },
  build: { section: 'projects', kind: 'build', list: workbench },
  article: { section: 'articles', kind: 'article', list: articles },
};

// ---------- Templates ----------
function pager(view, i, total) {
  return `<div class="pager">
    <button class="ghost-btn" type="button" data-open="${view}" data-index="${(i - 1 + total) % total}">${icon('left')} Previous</button>
    <span class="count">${pad(i + 1)} / ${pad(total)}</span>
    <button class="ghost-btn" type="button" data-open="${view}" data-index="${(i + 1) % total}">Next ${icon('right')}</button>
  </div>`;
}
function timeline(items) {
  return `<ol class="timeline">${items.map((e) => `
    <li${e.current ? ' class="current"' : ''}>
      <span class="when">${esc(e.when)}${e.current ? ' · <b>Current</b>' : ''}</span>
      <strong>${esc(e.title)}</strong>
      <span class="where">${esc(e.where)}</span>
      <p>${esc(e.what)}</p>
    </li>`).join('')}</ol>`;
}

const T = {
  about() {
    return `
      <header class="about-hero">
        <img class="portrait" src="${esc(profile.photo)}" alt="Portrait of Ruchir Ganatra" width="96" height="96">
        <div>
          <p class="kicker">The person at the desk</p>
          <h2 id="drawerTitle">${esc(profile.name)}</h2>
          <p class="role">${esc(profile.role)} · ${esc(profile.location)}</p>
        </div>
      </header>
      <p class="lead">${esc(profile.statement[0])}</p>
      ${profile.statement.slice(1).map((p) => `<p>${esc(p)}</p>`).join('')}
      <h3>How I work</h3>
      <div class="values">${profile.values.map(([t, d]) => `<div class="value"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join('')}</div>
      <h3>Experience</h3>${timeline(profile.experience)}
      <h3>Education</h3>${timeline(profile.education)}
      <h3>Toolkit</h3>
      ${Object.entries(profile.skills).map(([g, list]) => `<p class="skill-group">${esc(g)}</p><div class="chips">${list.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>`).join('')}
      <h3>Off the clock</h3>
      <ul class="dots">${profile.offClock.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
      <p class="muted small">${esc(profile.community)}</p>
      <h3>Voices</h3>
      ${profile.voices.map(([q, who]) => `<blockquote class="quote"><p>“${esc(q)}”</p><cite>— ${esc(who)}</cite></blockquote>`).join('')}
      <div class="cta-row">
        <button class="btn primary" type="button" data-open="contact">${icon('mail')} Get in touch</button>
        ${ext(profile.resume, 'Résumé')}
      </div>`;
  },
  certs() {
    return `
      <p class="kicker">The green wall</p>
      <h2 id="drawerTitle">${certificates.length} certificates, framed</h2>
      <p class="muted">Real credentials, hung where I can see them while I work. Pick one to take a closer look.</p>
      <div class="cert-grid">${certificates.map((c, i) => `
        <button class="cert-card" type="button" data-open="cert" data-index="${i}">
          <span class="thumb"><img src="${esc(c.preview)}" alt="" loading="lazy"></span>
          <strong>${esc(c.short)}</strong>
          <span class="muted small">${esc(c.issuer)} · ${esc(c.date)}</span>
        </button>`).join('')}
      </div>`;
  },
  cert(i) {
    const c = certificates[i];
    return `
      <p class="kicker">Credential ${pad(i + 1)} / ${pad(certificates.length)} · ${esc(c.date)}</p>
      <h2 id="drawerTitle">${esc(c.title)}</h2>
      <p class="role">${esc(c.issuer)}</p>
      <a class="cert-view" href="${esc(c.original)}" target="_blank" rel="noopener" aria-label="Open the original ${esc(c.title)} certificate">
        <img src="${esc(c.preview)}" alt="${esc(c.title)} certificate issued by ${esc(c.issuer)}">
      </a>
      <div class="story"><strong>${esc(c.story[0])}</strong><p>${esc(c.story[1])}</p></div>
      <div class="cta-row">${ext(c.original, 'Open original', 'btn primary')}</div>
      ${pager('cert', i, certificates.length)}`;
  },
  projects() {
    return `
      <p class="kicker">The bookshelf</p>
      <h2 id="drawerTitle">Things I've built</h2>
      <p class="muted">Boxed sets up top are the featured builds. The binders below are the workbench: smaller tools and analyses.</p>
      <h3>Featured</h3>
      <div class="proj-list">${projects.map((p, i) => `
        <button class="proj-card" type="button" data-open="project" data-index="${i}" style="--c:${esc(p.color)}">
          <span class="tag">${esc(p.tag)}</span>
          <strong>${esc(p.title)}</strong>
          <span class="muted small">${esc(p.hook)}</span>
        </button>`).join('')}
      </div>
      <h3>The workbench</h3>
      <ol class="mini-list">${workbench.map((b, i) => `
        <li><button type="button" data-open="build" data-index="${i}"><span class="num">${pad(i + 1)}</span><span><strong>${esc(b.title)}</strong><span class="muted small">${esc(b.desc)}</span></span></button></li>`).join('')}
      </ol>
      <div class="cta-row">${ext('https://github.com/Ganatra-Ruchir', 'Everything on GitHub')}</div>`;
  },
  project(i) {
    const p = projects[i];
    return `
      <div class="proj-hero" style="--c:${esc(p.color)}">
        <span class="tag">P/${pad(i + 1)} · ${esc(p.tag)}</span>
        <h2 id="drawerTitle">${esc(p.title)}</h2>
        <p>${esc(p.hook)}</p>
      </div>
      <p>${esc(p.desc)}</p>
      ${p.stats ? `<div class="stats">${p.stats.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div><p class="muted small">Held-out test window · 73,434 transactions · temporal split · scored once</p>` : ''}
      <h3>Built with</h3>
      <div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
      <div class="cta-row">
        ${p.live ? ext(p.live, 'Open live', 'btn primary') : ''}
        ${p.source ? ext(p.source, p.live ? 'Source' : 'Source & case study', p.live ? 'btn' : 'btn primary') : ''}
        ${p.writeup ? ext(p.writeup, 'Write-up') : ''}
        ${p.extra ? ext(p.extra.url, p.extra.label) : ''}
      </div>
      ${pager('project', i, projects.length)}`;
  },
  build(i) {
    const b = workbench[i];
    return `
      <p class="kicker">Workbench · binder ${pad(i + 1)} / ${pad(workbench.length)}</p>
      <h2 id="drawerTitle">${esc(b.title)}</h2>
      <p class="lead">${esc(b.desc)}</p>
      <div class="cta-row">
        ${b.live ? ext(b.live, 'Open live', 'btn primary') : ''}
        ${ext(b.source, 'Code', b.live ? 'btn' : 'btn primary')}
        ${b.writeup ? ext(b.writeup, 'Story') : ''}
      </div>
      ${pager('build', i, workbench.length)}`;
  },
  articles() {
    return `
      <p class="kicker">The journals on the desk</p>
      <h2 id="drawerTitle">${articles.length} published articles</h2>
      <p class="muted">Every journal is a story I published on Medium. The laptop is usually drafting the next one.</p>
      <div class="art-list">${articles.map((a, i) => `
        <button class="art-card" type="button" data-open="article" data-index="${i}" style="--c:${esc(a.color)}">
          <span class="art-thumb"><img src="${esc(a.image)}" alt="" loading="lazy" onerror="this.remove()"></span>
          <span class="art-text">
            <span class="kicker small">${esc(a.category)} · ${esc(a.date)}</span>
            <strong>${esc(a.title)}</strong>
            <span class="muted small">${esc(a.hook)}</span>
          </span>
        </button>`).join('')}
      </div>
      <div class="cta-row">${ext('https://ruchirganatra.medium.com', 'All writing on Medium')}</div>`;
  },
  article(i) {
    const a = articles[i];
    const parts = a.desc.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [a.desc];
    return `
      <div class="art-cover" style="--c:${esc(a.color)}"><img src="${esc(a.image)}" alt="Cover art for ${esc(a.title)}" onerror="this.remove()"></div>
      <p class="kicker">/${pad(i + 1)} · ${esc(a.category)} · ${esc(a.date)}</p>
      <h2 id="drawerTitle">${esc(a.title)}</h2>
      <p class="hook">${esc(a.hook)}</p>
      <p class="lead">${esc(parts[0].trim())}</p>
      <p>${esc(parts.slice(1).join(' ').trim())}</p>
      <div class="cta-row">${ext(a.url, 'Read the full article', 'btn primary')}</div>
      ${pager('article', i, articles.length)}`;
  },
  contact() {
    return `
      <p class="kicker">The neon sign</p>
      <h2 id="drawerTitle" class="big">Let's build something.</h2>
      <p class="lead">${esc(profile.availability)}</p>
      <div class="email-box">
        <a href="mailto:${esc(profile.email)}">${icon('mail')} ${esc(profile.email)}</a>
        <button class="icon-btn small" type="button" data-copy="${esc(profile.email)}" aria-label="Copy email address">${icon('copy')}</button>
      </div>
      <div class="cta-row">
        <a class="btn primary" href="mailto:${esc(profile.email)}">${icon('mail')} Email me</a>
        ${ext(profile.resume, 'Résumé')}
      </div>
      <h3>Elsewhere</h3>
      <ul class="link-list">${profile.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><span class="muted small">${esc(l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</span>${icon('ext')}</a></li>`).join('')}</ul>`;
  },
  secrets(found) {
    const n = SECRETS.filter((s) => found.has(s.id)).length;
    return `
      <p class="kicker">Explore the room</p>
      <h2 id="drawerTitle">Room secrets · ${n}/${SECRETS.length}</h2>
      <p class="muted">Little things hidden around the room. Click objects to find them; found ones can be revisited here.</p>
      <ul class="secret-list">${SECRETS.map((s) => found.has(s.id)
        ? `<li class="found"><span class="tick" aria-hidden="true">✓</span><span class="s-text"><strong>${esc(s.name)}</strong><span class="muted small">Found</span></span><button class="ghost-btn" type="button" data-secret="${s.id}">Show ${icon('right')}</button></li>`
        : `<li><span class="tick" aria-hidden="true">?</span><span class="s-text"><strong>Not found yet</strong><span class="muted small">${esc(s.hint)}</span></span></li>`).join('')}
      </ul>
      ${n === SECRETS.length ? '<p class="lead">You found everything. Thanks for exploring the room! 🎉</p>' : ''}`;
  },
};

// Small cards that pop up over objects in the room.
const POP = {
  cat: (s) => `
    <p class="pop-kicker">Commit · the room's cat</p>
    <p>Patrols the floor, naps on the beanbag and keeps an eye on the GitHub repos.</p>
    <p class="pop-meta">${s.pets ? `Petted ${s.pets} time${s.pets === 1 ? '' : 's'} 🐾` : 'Hasn’t been petted yet'}</p>
    <div class="pop-actions"><button class="btn primary" type="button" data-act="pet">Pet Commit</button>${ext(linkOf('GitHub'), 'Open GitHub')}</div>`,
  music: (s) => `
    <p class="pop-kicker">Record player</p>
    <p>Lo-fi for coffee-powered late-night build sessions, made live in your browser.</p>
    <div class="pop-actions"><button class="btn primary" type="button" data-act="music">${s.playing ? '■ Stop the record' : '▶ Play lo-fi'}</button></div>`,
  phone: () => `
    <p class="pop-kicker">1 new message · now</p>
    <p class="pop-quote">“Let’s connect?”</p>
    <p>Open to opportunities and focused freelance work.</p>
    <div class="pop-actions">${ext(linkOf('LinkedIn'), 'Connect on LinkedIn', 'btn primary')}<button class="btn" type="button" data-open="contact">Other ways</button></div>`,
  resume: () => `
    <p class="pop-kicker">Clipboard</p>
    <p><strong>Résumé — ${esc(profile.name)}</strong><br><span class="muted">${esc(profile.role)} · PDF</span></p>
    <div class="pop-actions">${ext(profile.resume, 'Open', 'btn primary')}<a class="btn" href="${esc(profile.resume)}" download>${icon('download')} Download</a></div>`,
  lanyard: () => `
    <p class="pop-kicker">Event passes</p>
    <p>${esc(profile.community)}</p>
    <p class="pop-quote small">“${esc(profile.voices[1][0])}”<span>— ${esc(profile.voices[1][1])}</span></p>
    <div class="pop-actions"><button class="btn" type="button" data-open="about">More about me</button></div>`,
  duck: (s) => `
    <p class="pop-kicker">Rubber duck · debugging buddy</p>
    <p class="pop-quote">${esc(DUCK_LINES[s.duck % DUCK_LINES.length])}</p>
    <div class="pop-actions"><button class="btn primary" type="button" data-act="squeak">Squeak again</button></div>`,
  plant: (s) => {
    const pct = Math.round(((s.growth - 1) / 0.35) * 100);
    return `
    <p class="pop-kicker">Growth mindset 🌱</p>
    <p>${esc(profile.values[0][1])}</p>
    <div class="grow" aria-hidden="true"><span style="width:${Math.max(4, pct)}%"></span></div>
    <p class="pop-meta">${pct >= 100 ? 'Fully grown. Thanks for watering!' : `Grown ${pct}%`}</p>
    <div class="pop-actions"><button class="btn primary" type="button" data-act="water"${pct >= 100 ? ' disabled' : ''}>💧 Water it</button></div>`;
  },
};

function listView(hasRoom) {
  return `
  <div class="list-inner">
    <div class="list-top">
      ${hasRoom ? `<button class="pill-btn" type="button" id="backToRoom">${icon('cube')} Back to the room</button>` : ''}
    </div>
    <header class="list-hero">
      <img class="portrait big" src="${esc(profile.photo)}" alt="Portrait of Ruchir Ganatra" width="120" height="120">
      <div>
        <p class="kicker">${esc(profile.role)} · ${esc(profile.location)}</p>
        <h1>${esc(profile.name)}</h1>
        <p class="lead">${esc(profile.intro)}</p>
        <div class="cta-row">
          <a class="btn primary" href="mailto:${esc(profile.email)}">${icon('mail')} Email me</a>
          ${ext(profile.resume, 'Résumé')}
          ${profile.links.slice(0, 3).map((l) => ext(l.url, l.label)).join('')}
        </div>
      </div>
    </header>
    <section aria-labelledby="l-about"><h2 id="l-about">About</h2>
      ${profile.statement.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="two-col"><div><h3>Experience</h3>${timeline(profile.experience)}</div><div><h3>Education</h3>${timeline(profile.education)}</div></div>
      <h3>Toolkit</h3>${Object.entries(profile.skills).map(([g, list]) => `<p class="skill-group">${esc(g)}</p><div class="chips">${list.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>`).join('')}
    </section>
    <section aria-labelledby="l-certs"><h2 id="l-certs">Certificates</h2>
      <div class="cert-grid wide">${certificates.map((c) => `
        <a class="cert-card" href="${esc(c.original)}" target="_blank" rel="noopener">
          <span class="thumb"><img src="${esc(c.preview)}" alt="" loading="lazy"></span>
          <strong>${esc(c.title)}</strong><span class="muted small">${esc(c.issuer)} · ${esc(c.date)}</span>
        </a>`).join('')}</div>
    </section>
    <section aria-labelledby="l-projects"><h2 id="l-projects">Projects</h2>
      <div class="proj-grid">${projects.map((p, i) => `
        <article class="proj-block" style="--c:${esc(p.color)}">
          <span class="tag">P/${pad(i + 1)} · ${esc(p.tag)}</span>
          <h3>${esc(p.title)}</h3><p class="muted">${esc(p.hook)}</p><p>${esc(p.desc)}</p>
          <div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          <div class="cta-row">${p.live ? ext(p.live, 'Live', 'btn primary') : ''}${p.source ? ext(p.source, 'Source') : ''}${p.writeup ? ext(p.writeup, 'Write-up') : ''}</div>
        </article>`).join('')}</div>
      <h3>The workbench</h3>
      <ol class="mini-list static">${workbench.map((b, i) => `
        <li><span class="num">${pad(i + 1)}</span><span><strong>${esc(b.title)}</strong> <span class="muted">${esc(b.desc)}</span>
          <span class="inline-links">${b.live ? `<a href="${esc(b.live)}" target="_blank" rel="noopener">Live</a>` : ''}<a href="${esc(b.source)}" target="_blank" rel="noopener">Code</a></span></span></li>`).join('')}
      </ol>
    </section>
    <section aria-labelledby="l-articles"><h2 id="l-articles">Articles</h2>
      <div class="art-list grid">${articles.map((a) => `
        <a class="art-card" href="${esc(a.url)}" target="_blank" rel="noopener" style="--c:${esc(a.color)}">
          <span class="art-thumb"><img src="${esc(a.image)}" alt="" loading="lazy" onerror="this.remove()"></span>
          <span class="art-text"><span class="kicker small">${esc(a.category)} · ${esc(a.date)}</span><strong>${esc(a.title)}</strong><span class="muted small">${esc(a.desc)}</span></span>
        </a>`).join('')}</div>
    </section>
    <section aria-labelledby="l-contact"><h2 id="l-contact">Contact</h2>
      <p class="lead">${esc(profile.availability)}</p>
      <ul class="link-list">${profile.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><span class="muted small">${esc(l.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>${icon('ext')}</a></li>`).join('')}</ul>
    </section>
    <footer class="muted small">© 2026 Ruchir Ganatra — built with curiosity in Ahmedabad.</footer>
  </div>`;
}

// ---------- Controller ----------
export function createUI({ room = null }) {
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const drawer = $('#drawer'), drawerBody = $('#drawerBody'), crumb = $('#drawerCrumb'), backBtn = $('#drawerBack');
  const list = $('#list'), tooltip = $('#tooltip'), markersEl = $('#markers');
  const mq = window.matchMedia('(max-width: 720px)');
  let state = null, lastFocus = null;

  // static chrome
  $('#fsBtn').innerHTML = icon('expand');
  $('#drawerClose').innerHTML = icon('x');
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0 && window.innerWidth<850;
  body.classList.toggle('touch', touch);
  if(touch){
    $('#tourInstruction').textContent='Left joystick to move · Swipe to look · Tap objects';
    const tip=document.querySelector('.mouse-tip');if(tip)tip.textContent='Joystick to move · Swipe to look · Tap to interact';
    $('#mouseSensitivityLabel').textContent='Swipe speed';
  }
  if (!document.documentElement.requestFullscreen) $('#fsBtn').hidden = true;
  backBtn.innerHTML = icon('left') + '<span></span>';
  document.querySelectorAll('.dock [data-go]').forEach((b) => {
    const s = SECTIONS[b.dataset.go];
    b.innerHTML = `${icon(s.icon)}<span>${s.label}</span>`;
    b.setAttribute('aria-label', s.label);
    b.title = s.label;
    b.addEventListener('click', () => open(b.dataset.go));
  });
  $('#listBtn').setAttribute('aria-label', 'Text version');
  $('#listBtn').innerHTML = `${icon('list')}<span>Text version</span>`;

  // ---------- Drawer ----------
  function insetDrawer(openNow) {
    if (!room) return;
    if (!openNow) return room.setInset(0);
    if (mq.matches) room.setInset(drawer.getBoundingClientRect().height || window.innerHeight * 0.62, 'y');
    else room.setInset(drawer.getBoundingClientRect().width + 16, 'x');
  }
  function open(view, index = 0) {
    if (room?.isTouring) return;
    const detail = DETAIL[view];
    const section = detail ? detail.section : view;
    if (!SECTIONS[section]) return;
    if (!drawer.classList.contains('open')) lastFocus = document.activeElement;
    hidePop();
    if (chat.isOpen) chat.close();
    panelOpened();
    state = { view, index };
    drawerBody.innerHTML = view === 'secrets' ? T.secrets(found) : detail ? T[view](index) : T[view]();
    drawerBody.scrollTop = 0;
    crumb.textContent = SECTIONS[section].label;
    backBtn.hidden = !detail;
    backBtn.querySelector('span').textContent = detail ? 'All ' + SECTIONS[section].label.toLowerCase() : '';
    backBtn.dataset.target = section;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    body.classList.add('drawer-open');
    document.querySelectorAll('.dock [data-go]').forEach((b) => b.setAttribute('aria-current', b.dataset.go === section ? 'true' : 'false'));
    if (room) {
      if (detail) room.select(detail.kind, index);
      else { room.clearSelection(); if (section === 'about') room.select('avatar', 0); room.focus(SECTIONS[section].room); }
    }
    requestAnimationFrame(() => { if (drawer.classList.contains('open')) insetDrawer(true); });
    drawerBody.focus({ preventScroll: true });
    hideHint();
  }
  function close() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    body.classList.remove('drawer-open');
    document.querySelectorAll('.dock [data-go]').forEach((b) => b.setAttribute('aria-current', 'false'));
    state = null;
    if (room) { room.clearSelection(); room.focus('overview'); insetDrawer(false); }
    lastFocus?.focus?.({ preventScroll: true });
    setTimeout(panelClosed, 0);
  }
  $('#drawerClose').addEventListener('click', close);
  backBtn.addEventListener('click', () => open(backBtn.dataset.target));
  drawerBody.addEventListener('click', (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      navigator.clipboard?.writeText(copy.dataset.copy).then(() => { copy.classList.add('done'); setTimeout(() => copy.classList.remove('done'), 1200); }).catch(() => {});
      return;
    }
    const sec = e.target.closest('[data-secret]');
    if (sec) {
      const id = sec.dataset.secret;
      close();
      setTimeout(() => { room?.focusOn(id); handleSelect(id, 0); }, 120);
      return;
    }
    const b = e.target.closest('[data-open]');
    if (b) open(b.dataset.open, Number(b.dataset.index || 0));
  });
  mq.addEventListener?.('change', () => { if (state) insetDrawer(true); });
  window.addEventListener('resize', () => { if (state) insetDrawer(true); });

  // ---------- Keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (popKind) return hidePop();
      if (!list.hidden && room) return toggleList(false);
      return close();
    }
    if (!state || !DETAIL[state.view] || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/input|textarea/i.test(document.activeElement?.tagName)) return;
    const total = DETAIL[state.view].list.length;
    if (e.key === 'ArrowRight') open(state.view, (state.index + 1) % total);
    if (e.key === 'ArrowLeft') open(state.view, (state.index - 1 + total) % total);
  });

  // ---------- Day / night ----------
  let night = false;
  function setNight(on) {
    night = on;
    body.dataset.mode = on ? 'night' : 'day';
    const mb = $('#modeBtn');
    mb.innerHTML = icon(on ? 'sun' : 'moon');
    mb.setAttribute('aria-label', on ? 'Switch to day' : 'Switch to night');
    mb.title = on ? 'Turn the lights to day' : 'Switch to night';
    document.querySelector('meta[name="theme-color"]').content = on ? '#151a2b' : '#f6ede2';
    room?.setNight(on);
  }
  $('#modeBtn').addEventListener('click', () => setNight(!night));
  // ---------- Full screen + first-person mouse look ----------
  function toggleMap() {} // first person only now
  function onMode(m) { body.dataset.view = m; }
  const canvasEl = document.getElementById('room');
  const bookDialog=$('#roomBook'),bookBody=$('#bookPages'),bookBack=$('#bookPrev'),bookNext=$('#bookNext');
  let bookState=null,bookFocus=null;
  const imageForBook=item=>item.image||articles.find(a=>a.url===item.writeup||item.title==='Literacy Gap Analysis'&&a.spine==="India's Classrooms"||item.title==='Delhi Air Quality 2021–2024'&&a.spine==='Delhi Air Quality'||item.title==='Global GDP Dashboard'&&a.spine==='Global GDP Dashboard')?.image;
  function renderBook(){
    if(!bookState)return;
    const {item,page}=bookState;
    const image=imageForBook(item);
    const title=esc(item.title);
    const stats=item.stats?.map(([k,v])=>'<li><strong>'+esc(v)+'</strong> '+esc(k)+'</li>').join('')||'';
    const stack=item.stack?.map(x=>'<li>'+esc(x)+'</li>').join('')||'';
    const left='<span class="book-kicker">RUCHIR · SELECTED WORK</span><h2>'+title+'</h2><p class="book-hook">'+esc(item.hook||item.tag||item.category||'Project notes')+'</p><p>'+esc(item.desc||'')+'</p>';
    const picture=image?'<figure><img src="'+esc(image)+'" alt="Project illustration or output" loading="lazy"><figcaption>Project documentation</figcaption></figure>':'<p class="book-note">No verified project image is available for this entry.</p>';
    const right=page===0?picture+(stack?'<h3>Technology</h3><ul>'+stack+'</ul>':'')+(stats?'<h3>Results</h3><ul>'+stats+'</ul>':''):
      '<h3>Explore the work</h3>'+(item.live?'<p>Try the working application directly.</p><button type="button" class="book-live" data-book-live>Load live preview</button><p class="book-note">Some websites block embedded previews. Open the original site if the frame is unavailable.</p>'+ext(item.live,'Open live site'):'<p>No live demo is listed for this entry.</p>')+(item.source?ext(item.source,'Source code'):'')+(item.url||item.writeup?ext(item.url||item.writeup,'Read the article'):'')+'<div id="bookPreview"></div>';
    bookBody.innerHTML='<article class="book-page">'+left+'</article><article class="book-page">'+right+'</article>';
    bookBody.querySelector('img')?.addEventListener('error',e=>{e.target.closest('figure').innerHTML='<p class="book-note">Documentation image unavailable.</p>';});
    $('#bookPageNumber').textContent=(page+1)+' / 2';bookBack.disabled=page===0;bookNext.disabled=page===1;
  }
  function openBook(kind,index){
    const item=({project:projects,build:workbench,article:articles})[kind]?.[index];if(!item||!room)return;
    bookFocus=document.activeElement;bookState={item,page:0};renderBook();
    room.select(kind,index);room.lockMovement(true);bookDialog.showModal();body.classList.add('book-open');releaseMouse();
  }
  function closeBook(){
    if(!bookDialog.open)return;bookDialog.close();
  }
  bookDialog.addEventListener('close',()=>{
    bookBody.replaceChildren();bookState=null;body.classList.remove('book-open');
    room?.clearSelection();room?.lockMovement(false);bookFocus?.focus?.({preventScroll:true});
  });
  $('#bookClose').addEventListener('click',closeBook);
  bookBack.addEventListener('click',()=>{if(bookState){bookState.page=0;renderBook();}});
  bookNext.addEventListener('click',()=>{if(bookState){bookState.page=1;renderBook();}});
  bookBody.addEventListener('click',e=>{
    if(!e.target.closest('[data-book-live]')||!bookState?.item.live)return;
    const host=$('#bookPreview');if(!host||host.querySelector('iframe'))return;
    const frame=document.createElement('iframe');frame.title='Live project preview';frame.src=bookState.item.live;
    frame.sandbox='allow-scripts allow-forms allow-popups';frame.referrerPolicy='no-referrer';frame.loading='lazy';host.append(frame);
  });
  $('#standUp').addEventListener('click',()=>room?.standUp());
  let playing = false;          // has the visitor clicked "play" yet?
  const panelOpen = () => drawer.classList.contains('open') || !list.hidden || chat.isOpen || !!popKind || bookDialog.open;
  let wasLocked = false;
  // After Esc or a closed panel, pointer lock must be requested by another real click.
  // A refused request must NOT permanently disable mouse-look.
  function lockDenied() {
    body.classList.add('click-to-look');
    toast('Click the room to control the camera, or drag to look');
  }
  function lockMouse() {
    if (!room || touch || !canvasEl.requestPointerLock || document.pointerLockElement || room.isTouring) return;
    try {
      const p = canvasEl.requestPointerLock();
      if (p && p.catch) p.catch(lockDenied);
    } catch { lockDenied(); }
  }
  function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock?.(); }
  function goFullscreen() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  const play = $('#play');
  function showPlay(kind) {
    if (!room || !list.hidden) return;
    const paused = kind === 'pause';
    $('#playKicker').textContent = paused ? 'Paused' : 'Ruchir Ganatra · Portfolio';
    $('#playTitle').textContent = paused ? 'Take a breather' : "Ruchir's Room";
    $('#playSub').textContent = paused ? 'The room will wait for you.' : 'Walk in, look around and come say hi. Everything in this room is part of my work.';
    $('#playBtn').textContent = paused ? '▶ Resume' : touch ? '▶ Tap to play' : '▶ Click to play';
    play.hidden = false;
    body.classList.add('at-play');
    body.classList.remove('at-game');
    room.setInput({ x: 0, y: 0, turn: 0, run: false });
  }
  function startPlaying() {
    if (room?.isTouring) return;
    play.hidden = true;
    body.classList.remove('at-play', 'click-to-look');
    body.classList.add('at-game');
    playing = true;
    // Mouse lock comes first: continuous mouse control is more important than
    // fullscreen if a browser only allows one privileged request per click.
    lockMouse();
    goFullscreen();
  }
  $('#playBtn').addEventListener('click', startPlaying);
  $('#playText').addEventListener('click', () => { play.hidden = true; body.classList.remove('at-play'); toggleList(true); });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvasEl;
    body.classList.toggle('locked', locked);
    if (locked) body.classList.remove('click-to-look');
    // pressed Esc while playing: pause, unless a panel is what took the mouse away
    if (!locked && wasLocked && playing && !panelOpen()) showPlay('pause');
    wasLocked = locked;
  });
  document.addEventListener('pointerlockerror', lockDenied);
  // panels need the mouse; when they close, go straight back to mouse look
  const panelOpened = () => releaseMouse();
  const panelClosed = () => {
    // Never attempt pointer lock from timers; a new real user click is required.
    if (playing && !panelOpen()) body.classList.add('click-to-look');
  };
  canvasEl.addEventListener('click', () => { if (playing && !panelOpen() && !document.pointerLockElement && play.hidden) lockMouse(); });
  function toggleFullscreen() {
    if (!document.documentElement.requestFullscreen) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    $('#fsBtn').innerHTML = icon(on ? 'shrink' : 'expand');
    $('#fsBtn').setAttribute('aria-label', on ? 'Exit full screen (F)' : 'Full screen (F)');
  });
  $('#fsBtn').addEventListener('click', toggleFullscreen);
  $('#fsBtn').title = 'Full screen (F)';

  // ---------- Controls help ----------
  const help = $('#help');
  const keysHtml = (touch
    ? [['Joystick', 'walk (push far to run)'], ['Drag', 'look around'], ['✋', 'talk / interact'], ['Tap floor', 'walk there']]
    : [['W S · ↑ ↓', 'walk'], ['A D', 'sidestep'], ['Mouse · ← →', 'look / turn'], ['Shift', 'run'], ['E · Click', 'talk / interact (aim with ＋)'], ['Esc', 'pause, free the mouse'], ['F', 'full screen']]
  ).map(([k, v]) => `<li><kbd>${esc(k)}</kbd><span>${esc(v)}</span></li>`).join('');
  $('#helpKeys').innerHTML = keysHtml;
  const qualitySelect=$('#graphicsQuality');if(qualitySelect&&room){qualitySelect.value=room.graphicsQuality;qualitySelect.addEventListener('change',()=>room.setGraphicsQuality(qualitySelect.value));}
  $('#playKeys').innerHTML = keysHtml;
  const qualityInfo=$('#materialInfo');
  function showMaterialInfo(){
    if(!qualityInfo||!room)return;
    const d=room.materialDiagnostics,models=Object.values(d.models),maps=Object.values(d.maps);
    qualityInfo.textContent='Render '+d.width+' × '+d.height+' px · Models '+models.filter(x=>x==='ready').length+'/'+models.length+' · Texture maps '+maps.filter(x=>x==='ready').length+'/'+maps.length+' loaded'+(models.includes('fallback')||maps.includes('fallback')?' · Some assets using fallback':'');
  }
  $('#helpBtn').addEventListener('click',showMaterialInfo);
  qualitySelect?.addEventListener('change',showMaterialInfo);
  let helpTimer = 0;
  function toggleHelp(show = help.hidden) { help.hidden = !show; clearTimeout(helpTimer); }
  function hideHelpSoon() { if (!help.hidden && !helpTimer) helpTimer = setTimeout(() => { help.hidden = true; helpTimer = 0; }, 4000); }
  $('#helpBtn').addEventListener('click', () => toggleHelp());

  // ---------- "Press E" prompt ----------
  const promptEl = $('#prompt'), promptText = $('#promptText'), actBtn = $('#actBtn');
  let promptOn = null;
  function setPrompt(p) {
    promptOn = p;
    promptEl.hidden = !p;
    actBtn.hidden = !p;
    if (p) { promptText.textContent = p.label; actBtn.setAttribute('aria-label', p.label);actBtn.textContent=p.kind==='plant'?'💧':'✋'; }
  }
  promptEl.querySelector('kbd').textContent = touch ? '✋' : 'E';
  promptEl.addEventListener('click', () => room?.interact());
  function updatePrompt() {
    if (!promptOn || !room) return;
    // first person: the prompt sits just under the crosshair
    const centred = room.mode === 'follow';
    promptEl.classList.toggle('centred', centred);
    if (centred) { promptEl.style.transform = ''; promptEl.style.opacity = ''; return; }
    const a = room.promptAnchor();
    if (!a) return;
    const p = room.toScreen(a);
    promptEl.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    promptEl.style.opacity = p.visible ? '' : '0';
  }

  // ---------- Talking to Ruchir ----------
  const chat = createChat({
    room,
    character: profile.character,
    getDrafting: () => drafting,
    onOpenSection: (v) => open(v),
    // keep you and the visitor in view beside the chat panel
    onToggle: (on, card) => {
      if (!room) return;
      if (!on) { if (!drawer.classList.contains('open')) room.setInset(0); setTimeout(panelClosed, 0); return; }
      panelOpened();
      requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        if (mq.matches) room.setInset(r.height, 'y'); else room.setInset(r.width + 16, 'x');
      });
    },
  });
  let drafting = articles[0].title;

  // Dialogue subtitles and a small deterministic top-down radar, both entirely local.
  const npcCaption = $('#npcSubtitle');
  let npcUntil = 0;
  function showNpcLine(index, text, duration) {
    if (!npcCaption || !text || !room) return;
    npcCaption.textContent = text;
    npcCaption.hidden = false;
    npcUntil = performance.now() + (duration || (text.includes('Come say hi') ? 3200 : 5600));
  }
  function updateNpcCaption() {
    if (npcCaption && !npcCaption.hidden && performance.now() > npcUntil) npcCaption.hidden = true;
  }

  // Automatic guided introduction. It plays immediately after the room loads,
  // without needing any input; fullscreen and spoken audio remain opt-in
  // because browsers restrict those without a real user gesture.
  const tourPanel = $('#guidedTour');
  const tourFinished = $('#tourFinished');
  const tourVoice = $('#tourVoice');
  let voiceEnabled = false;
  let currentNarration = '';
  let currentUtterance = null;
  const speechState = { enabled:false, active:false, word:'' };
  globalThis.__meeraVoice = speechState;
  function stopGuideVoice() {
    currentUtterance=null;
    speechState.active=false; speechState.word='';
    window.speechSynthesis?.cancel();
  }
  function speakGuide(text) {
    if (!voiceEnabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    stopGuideVoice();
    const u = new SpeechSynthesisUtterance(text.replace(/—/g, ', ').replace(/\bW, A, S, and D\b/g,'W, A, S and D'));
    const voices = window.speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
    const female=/Samantha|Zira|Aria|Jenny|Victoria|Karen|Female|Neerja|Heera|Libby|Ava|Emma|Serena|Sonia|Natasha|Michelle|Moira/i;
    const quality=/Natural|Neural|Premium|Enhanced|Online|Google US English|Google UK English Female/i;
    const ranked=voices.map(v=>({v,score:(female.test(v.name)?45:0)+(quality.test(v.name)?100:0)+(/en-IN/i.test(v.lang)?12:0)+(v.localService?0:5)})).sort((a,b)=>b.score-a.score);
    u.voice=ranked[0]?.v||null;
    u.lang=u.voice?.lang||'en-IN'; u.rate=.93; u.pitch=1.02; u.volume=.92;
    currentUtterance=u;
    u.onstart=()=>{if(currentUtterance===u){speechState.active=true;speechState.word='';}};
    u.onboundary=e=>{if(currentUtterance!==u)return;const word=u.text.slice(e.charIndex).match(/^\s*([\w'-]+)/);if(word)speechState.word=word[1];};
    const finish=()=>{if(currentUtterance===u){speechState.active=false;speechState.word='';currentUtterance=null;}};
    u.onend=finish;u.onerror=finish;
    try { window.speechSynthesis.speak(u); } catch { finish(); }
  }
  if (!('speechSynthesis' in window)) tourVoice.hidden = true;
  tourVoice?.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    speechState.enabled=voiceEnabled;
    tourVoice.textContent = voiceEnabled ? 'Mute Meera' : '◉ Hear Meera';
    tourVoice.setAttribute('aria-pressed', String(voiceEnabled));
    if (!voiceEnabled) stopGuideVoice();
    else if (currentNarration) speakGuide(currentNarration);
  });
  function beginGuidedTour() {
    play.hidden = true;
    playing = false;
    body.classList.remove('at-play');
    body.classList.add('tour-active');
    tourFinished.hidden = true;
    tourPanel.hidden = false;
    $('#tourBar').style.width = '0%';
    $('#tourProgress').setAttribute('aria-valuenow', '0');
    $('#tourFocus').hidden = true;
    $('#tourStopTitle').textContent = 'Meet your room guide';
    currentNarration = '';
  }
  function showTourStep(step) {
    if (!step || !tourPanel) return;
    const count = (String(step.index + 1)).padStart(2, '0');
    $('#tourCount').textContent = count + ' / ' + step.total;
    $('#tourStopTitle').textContent = step.title;
    $('#tourCategory').textContent = step.category || 'ROOM TOUR';
    const tags = $('#tourTags');
    tags.replaceChildren();
    (step.tags || []).slice(0, touch?2:5).forEach(t => {
      const badge = document.createElement('span');
      badge.textContent = String(t); // no HTML injection from portfolio content
      tags.appendChild(badge);
    });
    const focus = $('#tourFocus'), focusImage = $('#tourFocusImage');
    focus.hidden = touch || !step.image || step.beat !== 'exhibit';
    if (step.image && step.beat === 'exhibit') focusImage.src = step.image;
    currentNarration = step.text;
    showNpcLine(0, 'Meera: ' + step.text, (step.seconds + 0.25) * 1000);
    speakGuide(step.text);
  }
  function updateTourProgress() {
    if (!room?.isTouring || !tourPanel || tourPanel.hidden) return;
    const percentage = Math.round(room.tourProgress * 100);
    if($('#tourProgress').getAttribute('aria-valuenow')===String(percentage))return;
    $('#tourBar').style.width = percentage + '%';
    $('#tourProgress').setAttribute('aria-valuenow', String(percentage));
  }
  function completeGuidedTour() {
    body.classList.remove('tour-active');
    tourPanel.hidden = true;
    tourFinished.hidden = false;
    playing = false; // explicit Start Exploring click grants real pointer-lock permission
    if (voiceEnabled) stopGuideVoice();
    npcCaption.hidden=true;
    currentNarration='';
  }
  $('#tourSkip')?.addEventListener('click',()=>room?.skipGuidedTour());
  $('#tourExploreBtn')?.addEventListener('click', () => {
    tourFinished.hidden = true;
    startPlaying(); // deliberate user gesture enables continuous game mouse-look
  });
  const mouseSlider = $('#mouseSensitivity'), speedOutput = $('#mouseSensitivityValue');
  const invert = $('#invertMouse');
  const lookKey=touch?'touchLookSensitivityV3':'mouseSensitivity';
  const invertKey=touch?'touchInvertYV3':'invertMouse';
  const savedSensitivity = Number(store.get(lookKey, 1));
  const currentSensitivity = Number.isFinite(savedSensitivity) ? Math.max(0.35, Math.min(2.5, savedSensitivity)) : 1;
  if (mouseSlider) mouseSlider.value = String(currentSensitivity);
  if (speedOutput) speedOutput.textContent = currentSensitivity.toFixed(2) + '×';
  if (invert) invert.checked = !!store.get(invertKey, false);
  room?.setLookSettings({ sensitivity: currentSensitivity, invertY: invert?.checked });
  mouseSlider?.addEventListener('input', () => {
    const value = Number(mouseSlider.value);
    room?.setLookSettings({ sensitivity: value });
    speedOutput.textContent = value.toFixed(2) + '×';
    store.set(lookKey, value);
  });
  invert?.addEventListener('change', () => {
    room?.setLookSettings({ invertY: invert.checked });
    store.set(invertKey, invert.checked);
  });

  const minimap = $('#roomMiniMap');
  const mapCtx = minimap?.getContext('2d');
  let lastMap = -1000;
  function updateMiniMap() {
    if (!room || !mapCtx || !minimap || document.body.classList.contains('at-play')) return;
    const now = performance.now();
    if (now - lastMap < 120) return;
    lastMap = now;
    const ctx = mapCtx, w = minimap.width, h = minimap.height;
    const px = (x) => 16 + (x + 5) * (w - 32) / 10;
    const pz = (z) => 16 + (z + 5) * (h - 32) / 10;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111c24'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(221,233,225,.09)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i += 2) {
      ctx.beginPath(); ctx.moveTo(px(i), pz(-5)); ctx.lineTo(px(i), pz(5)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-5), pz(i)); ctx.lineTo(px(5), pz(i)); ctx.stroke();
    }
    ctx.strokeStyle = '#d5a77c'; ctx.lineWidth = 1.5;
    ctx.strokeRect(px(-5), pz(-5), px(5) - px(-5), pz(5) - pz(-5));
    function furniture(x0, z0, x1, z1) {
      ctx.fillStyle = 'rgba(169,140,116,.36)';
      ctx.fillRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0));
    }
    furniture(-2.3, -3.4, .7, -.95); furniture(1.25, -5, 4.75, -4.22);
    furniture(-5, 1.55, -4.25, 3.15);
    const other = room.npcPositions?.() || [];
    other.forEach((n, i) => {
      ctx.fillStyle = i ? '#8bd0e7' : '#eab889';
      ctx.beginPath(); ctx.arc(px(n.x), pz(n.z), 4.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(250,250,250,.7)'; ctx.lineWidth = 1; ctx.stroke();
    });
    const me = room.playerPos;
    ctx.save();
    ctx.translate(px(me.x), pz(me.z)); ctx.rotate(-room.playerYaw);
    ctx.shadowColor = '#f2fcff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#12191d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6.8, 7.5); ctx.lineTo(0, 4.1);
    ctx.lineTo(-6.8, 7.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#d8e9e0'; ctx.font = 'bold 8px Inter, sans-serif';
    ctx.fillText('N', w - 19, 11);
  }


  // ---------- Text version ----------
  list.innerHTML = listView(!!room);
  function toggleList(show) {
    if (room?.isTouring && show) return; // no navigation interrupts the authored introduction
    list.hidden = !show;
    body.classList.toggle('list-open', show);
    if (show) { close(); hidePop(); if (chat.isOpen) chat.close(); releaseMouse(); room?.pause?.(); list.scrollTop = 0; list.focus?.(); }
    else { room?.resume?.(); showPlay(playing ? 'pause' : 'start'); }
  }
  $('#listBtn').addEventListener('click', () => toggleList(true));
  $('#skipLink').addEventListener('click', (e) => { e.preventDefault(); toggleList(true); });
  list.addEventListener('click', (e) => { if (e.target.closest('#backToRoom')) toggleList(false); });
  list.tabIndex = -1;

  // ---------- Tooltip + hint ----------
  function showTooltip(hit, ev) {
    if (!hit || !ev) { tooltip.classList.remove('show'); return; }
    tooltip.textContent = hit.label;
    tooltip.style.transform = `translate(${ev.clientX + 16}px, ${ev.clientY + 14}px)`;
    tooltip.classList.add('show');
  }
  function hideHint() { hideHelpSoon(); }

  // ---------- Hotspot markers ----------
  const markers = (room?.hotspots || []).map((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'marker';
    b.innerHTML = `<span class="pulse" aria-hidden="true"></span><span class="m-label">${esc(h.label)}</span>`;
    b.setAttribute('aria-label', 'Open ' + h.label);
    b.addEventListener('click', () => open(h.id));
    markersEl.appendChild(b);
    return { el: b, h };
  });
  function updateMarkers() {
    if(room.mode==='follow')return;
    for (const m of markers) {
      const p = room.toScreen(m.h.pos);
      m.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      m.el.classList.toggle('off', !p.visible);
      m.el.classList.toggle('flip', p.x > window.innerWidth - (m.w || (m.w = m.el.offsetWidth + 8)));
    }
  }

  // ---------- Now drafting ----------
  function setWriting(a) { drafting = a.title; const el = $('#nowTitle'); if (el) el.textContent = a.title; }
  setWriting(articles[0]);

  // ---------- Toasts ----------
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ---------- Room secrets ----------
  const found = new Set(store.get('found', []).filter((id) => SECRETS.some((s) => s.id === id)));
  const secretsBtn = $('#secretsBtn');
  function renderSecrets() {
    secretsBtn.innerHTML = `${icon('spark')}<b>${found.size}/${SECRETS.length}</b>`;
    secretsBtn.setAttribute('aria-label', `Room secrets: ${found.size} of ${SECRETS.length} found`);
    secretsBtn.title = 'Room secrets';
  }
  function markFound(id) {
    if (!SECRETS.some((s) => s.id === id) || found.has(id)) return false;
    found.add(id);
    store.set('found', [...found]);
    renderSecrets();
    secretsBtn.classList.remove('bump'); void secretsBtn.offsetWidth; secretsBtn.classList.add('bump');
    const s = SECRETS.find((x) => x.id === id);
    toast(found.size === SECRETS.length ? `✦ All ${SECRETS.length} secrets found!` : `✦ Secret found: ${s.name} (${found.size}/${SECRETS.length})`);
    return true;
  }
  renderSecrets();
  secretsBtn.addEventListener('click', () => open('secrets'));

  // ---------- Pop-up cards over objects ----------
  const pop = $('#pop'), popBody = $('#popBody');
  $('#popClose').innerHTML = icon('x');
  let popKind = null;
  const popState = { pets: store.get('catPets', 0), playing: false, duck: 0, growth: 1 };
  function renderPop() { if (popKind) popBody.innerHTML = POP[popKind](popState); }
  function showPop(kind) {
    if (!room || room.isTouring) return;
    if (drawer.classList.contains('open')) close();
    if (popKind && popKind !== kind) hidePop();
    popKind = kind;
    room.select(kind);
    if (kind === 'cat') room.act('cat', 'attend');
    if (kind === 'phone') room.act('phone');
    if (kind === 'lanyard') room.act('lanyard');
    if (kind === 'duck') { sound.squeak(); room.act('duck'); }
    if (kind === 'plant') popState.growth = room.plantGrowth;
    if (kind === 'music') popState.playing = sound.lofi.playing;
    renderPop();
    pop.hidden = false;
    pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
    body.classList.add('pop-open');
    panelOpened();
    updatePop();
    hideHint();
  }
  function hidePop() {
    if (!popKind) return;
    if (popKind === 'cat') room?.act('cat', 'release');
    popKind = null;
    pop.hidden = true;
    body.classList.remove('pop-open');
    setTimeout(panelClosed, 0);
    room?.clearSelection();
    if (room?.view === 'custom') room.focus('overview');
  }
  function updatePop() {
    if (!popKind || !room) return;
    const a = room.anchorOf(popKind);
    if (!a) return;
    const p = room.toScreen(a);
    const w = pop.offsetWidth, h = pop.offsetHeight, m = 12;
    const vw = window.innerWidth;
    let x = Math.min(Math.max(p.x, w / 2 + m), vw - w / 2 - m);
    let y = p.y - 16;
    const below = y - h < 70;
    if (below) y = p.y + 28;
    pop.classList.toggle('below', below);
    pop.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(below ? y : y - h)}px)`;
    pop.style.setProperty('--tail', `${Math.round(Math.min(Math.max(p.x - (x - w / 2), 22), w - 22))}px`);
    pop.style.opacity = p.visible ? '' : '0';
  }
  $('#popClose').addEventListener('click', hidePop);
  popBody.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { const v = o.dataset.open; hidePop(); open(v); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'pet') {
      room.act('cat', 'pet'); sound.purr(2.6);
      popState.pets++; store.set('catPets', popState.pets);
    }
    if (act === 'music') {
      popState.playing = sound.lofi.toggle();
      room.act('music', popState.playing ? 'play' : 'stop');
      toast(popState.playing ? '♪ Lo-fi on — the record keeps spinning while you explore' : 'Record stopped');
    }
    if (act === 'squeak') { sound.squeak(); room.act('duck'); popState.duck++; }
    if (act === 'water') { sound.splash(); popState.growth = room.act('plant'); }
    renderPop();
    updatePop();
  });

  // Called when something in the 3D room is clicked.
  function handleSelect(kind, index) {
    if (room?.isTouring) return;
    if(kind==='seat'){if(room?.sitDown())toast('Seated · move joystick or tap Stand up to leave');return;}
    if(kind==='coffee'){if(room?.drinkCoffee(index))toast('Enjoy your coffee');return;}
    if(['project','build','article'].includes(kind)){hidePop();close();openBook(kind,index);return;}
    if (kind === 'npc') {
      const response = room?.act('npc', index);
      if (response) showNpcLine(index, response.name + ' · ' + response.role + ': ' + response.text);
      return;
    }
    if (kind === 'talk') { hidePop(); close(); chat.open(); return; }
    if (DRAWER_KIND[kind]) { hidePop(); return open(DRAWER_KIND[kind], index); }
    if (kind === 'window') {
      hidePop();
      setNight(!night);
      markFound('window') || toast(night ? '🌙 Night falls on Ahmedabad' : '☀️ Good morning, Ahmedabad');
      return;
    }
    if (kind === 'lamp') {
      const on = room.act('lamp');
      markFound('lamp') || toast(on ? '💡 Lamp on' : 'Lamp off');
      return;
    }
    if (POP_KINDS.includes(kind)) {
      if (popKind === kind) return hidePop();
      showPop(kind);
      markFound(kind);
    }
  }

  return {
    open, close, setNight, toggleList, setWriting, handleSelect, hidePop,
    toggleMap, toggleFullscreen, toggleHelp, hideHelpSoon, setPrompt, onMode,
    showStart: () => showPlay('start'),
    beginGuidedTour, showTourStep, completeGuidedTour,
    showNpcLine,
    get playing() { return playing && play.hidden; },
    blocksGameKeys: () => !!room?.isTouring || drawer.classList.contains('open') || !list.hidden || chat.isOpen || !play.hidden || bookDialog.open,
    updateMarkers() { updateMarkers(); updatePop(); updatePrompt(); updateNpcCaption(); updateMiniMap(); updateTourProgress(); $('#standUp').hidden=!room?.isSeated; },
    onHover: showTooltip,
    get isNight() { return night; },
  };
}
