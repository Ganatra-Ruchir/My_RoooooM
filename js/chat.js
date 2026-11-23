// Talk to Ruchir: quick-reply chips plus a box for typed questions.
// Replies come only from the portfolio data in data.js (no AI service, nothing sent anywhere).
import { profile, certificates, projects, workbench, articles } from './data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkOf = (label) => profile.links.find((l) => l.label === label)?.url;
const istHour = () => { const n = new Date(); return new Date(n.getTime() + (n.getTimezoneOffset() + 330) * 60000).getHours(); };
const greeting = () => { const h = istHour(); return h < 5 ? 'Hey, night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

// What a visitor might ask. `chip` is the quick-reply label (null = only reachable by typing).
const TOPICS = [
  { id: 'greet', chip: 'Hi 👋', re: /\b(hi+|hello+|hey+|hola|namaste|yo|sup|good (morning|afternoon|evening))\b/i },
  { id: 'name', chip: 'What’s your name?', re: /\b(name|who are you|who r u|introduce|about you|yourself)\b/i },
  { id: 'work', chip: 'What do you do?', re: /\b(work|job|do you do|role|company|elixir|analyst|career|experience|intern\w*|office)\b/i },
  { id: 'projects', chip: 'Show me your projects', re: /\b(projects?|builds?|built|portfolio|github|code|apps?|docusense|skyrecon|backstop|pdfly)\b/i },
  { id: 'skills', chip: 'Your skills?', re: /\b(skills?|stack|tech|tools?|python|sql|power ?bi|languages?|frameworks?|ml|machine learning|react)\b/i },
  { id: 'education', chip: 'Where do you study?', re: /\b(study|studying|college|degree|education|b\.?tech|diploma|student|university|school)\b/i },
  { id: 'certs', chip: 'Certificates', re: /\b(certif\w*|courses?|credentials?)\b/i },
  { id: 'articles', chip: 'Your articles', re: /\b(articles?|blogs?|write|writing|medium|posts?)\b/i },
  { id: 'contact', chip: 'How can I reach you?', re: /\b(contact|e-?mail|mail|hire|reach|linkedin|resume|r[ée]sum[ée]|cv|freelance|available|connect)\b/i },
  { id: 'fun', chip: 'Something fun', re: /\b(fun|hobby|hobbies|free time|weekend|coffee|cat|commit|webtoon|photo\w*|lookism)\b/i },
  { id: 'location', chip: null, re: /\b(where|live|from|city|ahmedabad|india|location|based)\b/i },
  { id: 'bye', chip: 'Bye!', re: /\b(bye|goodbye|see ya|see you|cya|thanks|thank you|thx|ty)\b/i },
];
const PRIORITY = ['contact', 'projects', 'skills', 'education', 'certs', 'articles', 'work', 'name', 'fun', 'location', 'bye', 'greet'];

export function intentOf(text) {
  let hits = TOPICS.filter((t) => t.re.test(text)).map((t) => t.id);
  if (hits.length > 1) hits = hits.filter((id) => id !== 'greet'); // "hi, what do you do?" is about work
  return PRIORITY.find((id) => hits.includes(id)) || null;
}

let funIndex = 0;
function reply(id, ctx) {
  switch (id) {
    case 'greet':
      return { text: `${greeting()}! 👋 I'm Ruchir. Welcome to my room, make yourself at home. Ask me anything, or pick a topic below.` };
    case 'name':
      return { text: `I'm ${profile.name}, a ${profile.role} from ${profile.location}. The cat wandering around is Commit, the room's unofficial code reviewer.` };
    case 'work': {
      const [now, prev] = profile.experience;
      return {
        text: `I'm a ${now.title} at ${now.where.split(' · ')[0]}, an NGO in Ahmedabad. ${now.what} Before that I was a ${prev.title} at ${prev.where}.`,
        actions: [{ label: 'Full experience', open: 'about' }],
      };
    }
    case 'projects':
      return {
        text: `My builds live on the bookshelf. The boxed sets are the featured ones: ${projects.map((p) => p.title).join(', ')}. The binders below hold ${workbench.length} smaller tools and analyses.`,
        actions: [{ label: 'Browse projects', open: 'projects' }, { label: 'GitHub', url: linkOf('GitHub') }],
      };
    case 'skills':
      return {
        text: 'Day to day it’s Python, SQL and Power BI, plus Pandas, React and Flask / FastAPI. For machine learning: scikit-learn, XGBoost and SHAP. The other half matters just as much: data storytelling, teamwork and stakeholder empathy. It’s all on the whiteboard by the door.',
        actions: [{ label: 'See my toolkit', open: 'about' }],
      };
    case 'education': {
      const [now, before] = profile.education;
      return { text: `I'm studying ${now.title} at ${now.where}. Before that I did my ${before.title} there (${before.when}).` };
    }
    case 'certs':
      return {
        text: `${certificates.length} of them are framed on the green wall: Google Analytics, IBM SkillsBuild courses on AI and cloud, Cisco's Data Science Essentials, Kaggle Python and more. Walk up to the wall to read them.`,
        actions: [{ label: 'View certificates', open: 'certs' }],
      };
    case 'articles':
      return {
        text: `I write on Medium. The journals on my desk are my ${articles.length} articles, from India's literacy gap to conversational analytics. My laptop keeps replaying drafts; right now it's showing “${ctx.drafting}”.`,
        actions: [{ label: 'Read articles', open: 'articles' }, { label: 'Medium', url: linkOf('Medium') }],
      };
    case 'contact':
      return {
        text: `${profile.availability} Email me at ${profile.email}, or connect on LinkedIn.`,
        actions: [{ label: 'Email me', url: 'mailto:' + profile.email }, { label: 'LinkedIn', url: linkOf('LinkedIn') }, { label: 'Résumé', url: profile.resume }],
      };
    case 'fun': {
      const item = profile.offClock[funIndex++ % profile.offClock.length];
      return { text: `Off the clock: ${item.charAt(0).toLowerCase() + item.slice(1)} Ask again for another one, or go pet Commit. 🐈` };
    }
    case 'location':
      return { text: `I'm based in ${profile.location}. The clock on my wall runs on IST, so you can tell when it's a late-night build session.` };
    case 'bye':
      return { text: 'Thanks for stopping by! Explore anything that glows, and say bye to Commit on your way out. 👋', actions: [{ label: 'End chat', close: true }] };
    default:
      return { text: 'Good question! I’m the room version of me, so I mostly know about my work, projects, skills, studies, writing and how to reach me. Try one of the topics below.' };
  }
}

export function createChat({ room, onOpenSection, getDrafting, character, onToggle }) {
  const $ = (s) => document.querySelector(s);
  const el = $('#chat'), log = $('#chatLog'), chips = $('#chatChips'), form = $('#chatForm'), inputEl = $('#chatInput');
  const art = $('#chatArt'), face = $('#chatFace');
  face.src = character || profile.photo;
  face.classList.toggle('from-art', !!character);
  if (character) art.innerHTML = `<img src="${esc(character)}" alt="Ruchir Ganatra">`;
  else art.remove();
  let open = false, typingTimer = 0;
  const fine = window.matchMedia('(pointer: fine)').matches;

  chips.innerHTML = TOPICS.filter((t) => t.chip).map((t, i) => `<button type="button" class="chip-btn" data-topic="${t.id}"><kbd>${i + 1}</kbd>${esc(t.chip)}</button>`).join('');

  function scroll() { log.scrollTop = log.scrollHeight; }
  function addUser(text) {
    const b = document.createElement('div');
    b.className = 'msg me';
    b.textContent = text;
    log.appendChild(b); scroll();
  }
  function addBot({ text, actions = [] }) {
    clearInterval(typingTimer);
    const b = document.createElement('div');
    b.className = 'msg bot typing';
    b.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    log.appendChild(b); scroll();
    room?.setTalking(true);
    setTimeout(() => {
      b.classList.remove('typing');
      b.innerHTML = '<p></p>';
      const p = b.firstChild;
      let i = 0;
      const step = Math.max(1, Math.round(text.length / 60));
      typingTimer = setInterval(() => {
        i = Math.min(text.length, i + step);
        p.textContent = text.slice(0, i);
        scroll();
        if (i >= text.length) {
          clearInterval(typingTimer);
          if (actions.length) {
            const row = document.createElement('div');
            row.className = 'msg-actions';
            row.innerHTML = actions.map((a) => a.url
              ? `<a class="btn small" href="${esc(a.url)}" ${a.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"'}>${esc(a.label)} ↗</a>`
              : `<button type="button" class="btn small" ${a.open ? `data-open="${a.open}"` : 'data-close'}>${esc(a.label)}</button>`).join('');
            b.appendChild(row); scroll();
          }
        }
      }, 18);
    }, 380);
  }
  function ask(id, text) {
    addUser(text);
    addBot(reply(id, { drafting: getDrafting?.() || articles[0].title }));
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (!b) return;
    const t = TOPICS.find((x) => x.id === b.dataset.topic);
    ask(t.id, t.chip.replace(/\s*👋$/, ''));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    ask(intentOf(text), text);
  });
  log.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { close(); onOpenSection?.(o.dataset.open); return; }
    if (e.target.closest('[data-close]')) close();
  });
  $('#chatClose').addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (document.activeElement === inputEl) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { const b = chips.querySelectorAll('[data-topic]')[n - 1]; if (b) { e.preventDefault(); b.click(); } }
  }, true);

  function openChat() {
    if (open) return;
    open = true;
    el.hidden = false;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    document.body.classList.add('chatting');
    room?.setTalking(true);
    if (!log.children.length) addBot(reply('greet'));
    else addBot({ text: 'Welcome back! What else would you like to know?' });
    if (fine) setTimeout(() => inputEl.focus({ preventScroll: true }), 50);
    onToggle?.(true, el.querySelector('.chat-card'));
  }
  function close() {
    if (!open) return;
    open = false;
    clearInterval(typingTimer);
    el.hidden = true;
    document.body.classList.remove('chatting');
    room?.setTalking(false);
    inputEl.blur();
    onToggle?.(false);
  }
  return { open: openChat, close, get isOpen() { return open; } };
}
