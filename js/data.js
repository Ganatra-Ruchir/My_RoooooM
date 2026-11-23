// All portfolio content lives here. Edit this file to update the room.
// Source: Ruchir's existing portfolio (ruchirganatra-github-io.vercel.app).

export const profile = {
  name: 'Ruchir Ganatra',
  role: 'Data & Digital Systems Analyst',
  location: 'Ahmedabad, India',
  photo: 'assets/ruchir-ganatra.png',
  // Full-body character art with a transparent background. When set, Ruchir appears in the
  // room as a life-size standee and the art slides in beside the chat. null = 3D avatar at the desk.
  character: null,
  resume: 'assets/Ruchir_Ganatra_Resume.pdf',
  tagline: 'Turning noise into signal.',
  intro:
    'I build dashboards, data pipelines and web tools that turn messy information into clear decisions. Real data, practical systems, measurable results.',
  statement: [
    'I like data that leads to a decision, not another dashboard. I turn messy records into systems people can trust and use.',
    "I'm based in Ahmedabad, studying B.Tech IT at Aditya Silver Oak Institute of Technology. At Elixir Foundation, I work as a Data & Digital Systems Analyst, turning beneficiary and programme records into reporting teams can act on.",
    "Outside work, I build document AI, security dashboards and practical tools. I test my assumptions, report results as they are and improve what doesn't work.",
  ],
  values: [
    ['Growth mindset', 'Learning something new is the default state, not a phase.'],
    ['Problem solver', 'Turning complexity into something simple enough to act on.'],
    ['Team player', "The best analysis is useless if the team can't use it."],
    ['Responsibility', 'Honest numbers, documented gaps, owned mistakes.'],
  ],
  offClock: [
    'Coffee-powered late-night build sessions.',
    'Portrait photography and aesthetic grooming.',
    'Exploring Ahmedabad, usually via Rapido.',
    'Webtoon reader — long-running Lookism fan.',
    'Organising local community tech events.',
  ],
  community:
    'Coordinated speakers and event logistics for Startup Mini Meetup, Ahmedabad Innovation Summit and FITAG Tech Expo 2026.',
  skills: {
    'Technical & dev': ['Python', 'SQL', 'JavaScript', 'React', 'Flask', 'FastAPI'],
    'Data & analytics': ['Pandas', 'Power BI', 'Matplotlib', 'Plotly', 'Google Sheets automation', 'Data storytelling'],
    'ML & tools': ['scikit-learn', 'XGBoost', 'SHAP', 'Transformers.js', 'Docker', 'Cybersecurity'],
    'The other half': ['Communication', 'Teamwork', 'Leadership', 'Time management', 'Critical thinking', 'Public speaking', 'Stakeholder empathy'],
  },
  experience: [
    { when: 'Jun 2026 — Present', title: 'Data & Digital Systems Analyst', where: 'Elixir Foundation · NGO, Ahmedabad', what: 'Clean and analyse beneficiary data, build dashboards and support reporting so programme teams can track progress and act on it.', current: true },
    { when: '2026', title: 'Data Analyst Intern', where: 'BrainyBeam Technologies', what: 'Python, SQL, machine learning and Power BI turned into actionable insight for business logic decisions.' },
    { when: '2026', title: 'CSR Social Impact Projects', where: 'Independent / volunteer', what: 'Analysed beneficiary trends to help teams understand programme reach and results.' },
    { when: '2024 — Present', title: 'Data Analyst — Projects & Freelance', where: 'Self-employed, Ahmedabad', what: 'Built dashboards, analysed data with SQL and strengthened Python skills through real projects.', current: true },
  ],
  education: [
    { when: '2026 — Present', title: 'B.Tech, Information Technology', where: 'Aditya Silver Oak Institute of Technology', what: 'Studying software systems, data engineering and core IT fundamentals.', current: true },
    { when: '2023 — 2026', title: 'Diploma, Information Technology', where: 'Aditya Silver Oak Institute of Technology', what: 'Built a foundation in databases, statistics, machine learning and web development.' },
  ],
  voices: [
    ['Ruchir is an incredibly fast learner. Through our group projects he kept a positive attitude and was always open to taking feedback and acting on it. A true team player.', 'Faculty recommendation'],
    ['Organising the Tech Expo with Ruchir was seamless. Coordinating teams and running logistics while keeping everyone motivated is a rare kind of leadership.', 'Event co-organiser'],
  ],
  availability:
    'Available for focused freelance work in dashboards, SQL, Google Sheets automation and reporting. Got messy data or a workflow to fix? Let’s talk.',
  email: 'thakkerruchir044@gmail.com',
  links: [
    { label: 'GitHub', url: 'https://github.com/Ganatra-Ruchir' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ganatra-ruchir-61a2a2358/' },
    { label: 'Medium', url: 'https://ruchirganatra.medium.com' },
    { label: 'X', url: 'https://x.com/ruchirganatra' },
    { label: 'Linktree', url: 'https://linktr.ee/ruchir.ganatra' },
  ],
};

const C = 'assets/certificates/';
export const certificates = [
  { title: 'Google Analytics Certification', short: 'Google Analytics', issuer: 'Google', date: 'Sep 2026', file: 'google-analytics.pdf', story: ['Understanding the people behind the numbers.', 'Analytics matters when behavior becomes a better decision—not simply another chart.'] },
  { title: 'Google Ads Measurement', short: 'Ads Measurement', issuer: 'Google', date: 'Sep 2026', file: 'google-ads.pdf', story: ['Measure results, not just activity.', 'The useful question is whether a campaign created value. Clear measurement keeps attention on outcomes.'] },
  { title: 'Getting Started with Artificial Intelligence', short: 'Getting Started with AI', issuer: 'IBM SkillsBuild', date: 'Sep 2026', file: 'ibm-ai.pdf', story: ['Building AI with judgment.', 'Learning the foundations matters because useful systems must also be explainable, responsible and practical.'] },
  { title: 'Cloud Computing Fundamentals', short: 'Cloud Computing', issuer: 'IBM SkillsBuild', date: 'Aug 2026', file: 'ibm-cloud.pdf', story: ['Thinking beyond the code.', 'Reliable software depends on infrastructure and thoughtful systems design, not just what happens on screen.'] },
  { title: 'Generative AI Essentials: Using LLMs with Data', short: 'Generative AI Essentials', issuer: 'IBM SkillsBuild', date: 'Sep 2026', file: 'generative-ai.pdf', story: ['Turning language models into useful tools.', 'The exciting part is not a clever response; it is helping someone reach an answer they can verify.'] },
  { title: 'Data Science Essentials with Python', short: 'Data Science & Python', issuer: 'Cisco Networking Academy', date: 'Sep 2026', file: 'cisco-data-science.pdf', story: ['Question the data before the result.', 'Good analysis earns trust through clean inputs, honest methods and decisions that make sense.'] },
  { title: 'Data Visualization', short: 'Data Visualization', issuer: 'Kaggle', date: '2026', file: 'kaggle-visualization.png', story: ['Make complex stories understandable.', 'A strong chart should invite questions and reveal what matters—even for someone who never writes SQL.'] },
  { title: 'Python', short: 'Python', issuer: 'Kaggle', date: 'Feb 2026', file: 'kaggle-python.pdf', story: ['Small scripts. Real leverage.', 'Python is a foundation for saving repetitive effort and making everyday workflows more dependable.'] },
  { title: 'AI Tools and ChatGPT Workshop', short: 'AI Tools & ChatGPT', issuer: 'be10X', date: 'Jan 2026', file: 'be10x-ai.pdf', story: ['Curiosity, applied with care.', 'New tools are worth learning when they solve actual problems, not simply because they are new.'] },
  { title: 'Generative AI Essentials Badge', short: 'Generative AI Badge', issuer: 'IBM SkillsBuild', date: '2026', file: 'ibm-genai-badge.pdf', story: ['Learning keeps moving forward.', 'A credential marks progress, but its real value comes from what gets built and improved afterwards.'] },
].map((c) => ({
  ...c,
  original: C + c.file,
  preview: C + 'previews/' + c.file.replace(/\.(pdf|png)$/i, '.webp'),
}));

export const projects = [
  {
    title: 'DocuSense AI', tag: 'Latest · Live', color: '#3f6fd8',
    hook: 'Private document answers — no cloud uploads',
    desc: 'Private document Q&A, entirely in your browser. Open files, search by meaning and get answers without sending sensitive data to a server. On-device models handle retrieval and answer extraction, while role-based filtering and a six-question test suite check access, accuracy and speed.',
    stack: ['Transformers.js', 'ONNX / WASM', 'PDF.js', 'Vanilla JS', 'RAG'],
    live: 'https://docusense-ai-xi.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/docusense-ai',
  },
  {
    title: 'SkyRecon', tag: 'Flagship · Live', color: '#1f8a78',
    hook: 'Live threat monitoring in one dashboard',
    desc: 'Threat signals, one clear view. SkyRecon brings live IOC feeds, automated detection and ML-ranked alerts into a role-based dashboard. Built with Python, React and TypeScript to help security analysts spot threats and focus on what needs attention.',
    stack: ['Python', 'React', 'TypeScript', 'Flask / FastAPI', 'SQLite'],
    live: 'https://skyrecon-neon.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/skyrecon',
    writeup: 'https://ruchirganatra.medium.com/%EF%B8%8F-skyrecon-my-ai-powered-cybersecurity-dashboard-for-real-time-ioc-detection-715354c3cafb',
  },
  {
    title: 'Literacy Gap Analysis', tag: 'Real data · Live', color: '#d9822b',
    hook: "India's education gaps, backed by real data",
    desc: 'Real education data. No convenient assumptions. Built on 2015–16 UDISE records, with documented metrics, automated checks and missing data kept visible. Classroom crowding showed little link to exam pass rates (r ≈ −0.13) — a weak result reported as-is, not dressed up.',
    stack: ['Python', 'Pandas', 'Matplotlib', 'pytest', 'UDISE'],
    live: 'https://india-education-gap-analysis.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/india-education-gap-analysis',
  },
  {
    title: 'Backstop', tag: 'Machine learning', color: '#b2453c',
    hook: 'Fraud detection built around real-world cost',
    desc: 'Fraud detection built for real decisions. Tested 11 models on 283,726 transactions using chronological splits, cost-based thresholds and SHAP explanations. On held-out data, it caught 65 of 97 frauds with one false alarm, avoiding €7,071 in exposure. FastAPI serves scores in 2.1 ms, with drift monitoring built in.',
    stack: ['Python', 'XGBoost', 'scikit-learn', 'SHAP', 'FastAPI', 'Docker'],
    stats: [['Average precision', '0.798'], ['Frauds caught', '65 / 97'], ['False alarms', '1'], ['Loss avoided', '€7,071'], ['Response time', '2.1 ms']],
    source: 'https://github.com/Ganatra-Ruchir/Backstop-1.0.0-',
    extra: { label: 'Model card', url: 'https://github.com/Ganatra-Ruchir/Backstop-1.0.0-/blob/main/docs/MODEL_CARD.md' },
  },
  {
    title: 'PDFly', tag: 'Utility · Live', color: '#7a4fb8',
    hook: 'Everyday PDF tools. Files stay on your device.',
    desc: 'PDF work without handing over your files. Merge, split, compress, rotate, watermark, password-protect and convert documents directly in the browser. Nothing is uploaded or processed on a server — your files stay on your device.',
    stack: ['JavaScript', 'pdf-lib', 'pdf.js', 'JSZip', 'Client-side'],
    live: 'https://pdfy.antideploy.com/', source: 'https://github.com/Ganatra-Ruchir/pdfy',
  },
];

// Smaller builds from "The workbench".
export const workbench = [
  { title: 'Delhi Air Quality 2021–2024', desc: 'Finds seasonal pollution patterns across 1,461 days of Delhi AQI data.', live: 'https://delhi-aqi-analysis-2021-2024.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/delhi-aqi-analysis-2021-2024' },
  { title: 'Global GDP Dashboard', desc: 'Compare GDP trends and forecasts across countries in one dashboard.', source: 'https://github.com/Ganatra-Ruchir/global-gdp-dashboard' },
  { title: 'COVID-19 Global Analysis', desc: 'Explore COVID-19 trends and country comparisons with interactive filters.', source: 'https://github.com/Ganatra-Ruchir/COVID-19-analysis-using-Kaggle-data' },
  { title: 'NetGuard', desc: 'Flags suspicious TCP, UDP, DNS and TLS traffic using ML.', source: 'https://github.com/Ganatra-Ruchir/NetGuard' },
  { title: 'CryptoFlow-Notify', desc: 'Live alerts for wallet transfers and governance activity.', source: 'https://github.com/Ganatra-Ruchir/CryptoFlow-Notify', writeup: 'https://ruchirganatra.medium.com/why-i-built-cryptoflow-notify-3d434bdabdf9' },
  { title: 'SecureVault', desc: 'Encrypted password storage that keeps data on your device.', source: 'https://github.com/Ganatra-Ruchir/SecureVault' },
  { title: 'Ransomware Canary Detector', desc: 'Detects suspicious file changes early using ransomware decoys.', source: 'https://github.com/Ganatra-Ruchir/ransomware-canary-detector' },
  { title: 'Sashakt Salon Impact Dashboard', desc: 'Tracks salon beneficiary income and programme performance.', live: 'https://sashakt-salon-dashboard.antideploy.com/', source: 'https://github.com/Ganatra-Ruchir/Sashakt-Salon-Dashboard-' },
  { title: 'Sashakt Daily Activity Log', desc: 'Makes daily field reporting structured and easy to review.', live: 'https://beognis.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/beognis' },
  { title: 'Salon Beneficiary Income Tracker', desc: 'Captures beneficiary income through a simple field-entry tool.', live: 'https://diva-salon-beneficiary-income-track.vercel.app/', source: 'https://github.com/Ganatra-Ruchir/Diva-Salon---Beneficiary-Income-Tracker-Narol-form-' },
];

export const articles = [
  {
    title: "What India's Classrooms Tell Us", spine: "India's Classrooms", category: 'Data analytics', date: 'Aug 2026', color: '#2f5d8a',
    hook: 'Beyond the national average',
    desc: 'A national literacy figure hides the gaps that matter. I explore differences between states, gender parity and school dropout risk—and how an analyst can turn broad education goals into sharper questions. This article openly identifies where sample data was used instead of presenting it as official statistics.',
    image: 'https://raw.githubusercontent.com/Ganatra-Ruchir/india-education-gap-analysis/main/outputs/02_gender_gap.png',
    url: 'https://ruchirganatra.medium.com/what-indias-classrooms-tell-us-a-data-analyst-s-look-at-the-literacy-gap-e34dc51ee706',
  },
  {
    title: 'The Death of the Static Dashboard', spine: 'Static Dashboard', category: 'AI & analytics', date: 'Jul 2026', color: '#6b4c9a',
    hook: 'From charts to questions',
    desc: 'Dashboards answer predefined questions. People need to ask new ones. This piece explains conversational analytics, why connecting a language model straight to a database can mislead, and how a semantic layer turns business definitions into more trustworthy AI answers.',
    image: 'assets/articles/ai-conversational-analytics.svg',
    url: 'https://ruchirganatra.medium.com/the-death-of-the-static-dashboard-why-conversational-ai-is-the-next-frontier-for-data-analytics-8039f38311d1',
  },
  {
    title: 'Building a Global GDP Dashboard', spine: 'Global GDP Dashboard', category: 'Data science', date: 'Jan 2026', color: '#b5762f',
    hook: 'Economies, compared clearly',
    desc: 'A practical walkthrough of an interactive GDP dashboard for 180-plus countries. From cleaning World Bank and UN data to country comparisons and forecasting, the article covers the Flask, Pandas and Plotly decisions behind turning economic data into something useful.',
    image: 'assets/articles/gdp-analysis.svg',
    url: 'https://ruchirganatra.medium.com/building-a-professional-global-gdp-analysis-dashboard-a-complete-data-science-project-8372a22f8c02',
  },
  {
    title: "Analyzing Delhi's Air Quality", spine: 'Delhi Air Quality', category: 'Data science', date: 'Jan 2026', color: '#5f7f64',
    hook: 'Look beyond the haze',
    desc: 'Four years of Delhi air-quality readings tell more than a single AQI number. I examine seasonal cycles, pollutant relationships and how readings shift over time—separating what the historical data shows from claims about what caused it.',
    image: 'https://raw.githubusercontent.com/Ganatra-Ruchir/delhi-aqi-analysis-2021-2024/main/1.%20Exploratory%20Data%20Analysis%20%28EDA%29%20project/images/plots/04_seasonal_analysis.png',
    url: 'https://ruchirganatra.medium.com/analyzing-delhis-air-quality-a-comprehensive-data-science-approach-2021-2024-0e3d03b67eab',
  },
  {
    title: 'SkyRecon: An AI Security Dashboard', spine: 'SkyRecon Security', category: 'Cybersecurity', date: 'Jun 2025', color: '#20665a',
    hook: 'Signals worth noticing',
    desc: 'Security analysts need one clear view of changing threats. I explain how SkyRecon uses React, TypeScript and Flask to process IOC files, display threat statistics and surface alerts, plus the challenges of turning security feeds into a usable dashboard.',
    image: 'https://raw.githubusercontent.com/Ganatra-Ruchir/skyrecon/main/docs/screenshots/overview.png',
    url: 'https://ruchirganatra.medium.com/%EF%B8%8F-skyrecon-my-ai-powered-cybersecurity-dashboard-for-real-time-ioc-detection-715354c3cafb',
  },
  {
    title: 'Why I Built CryptoFlow-Notify', spine: 'CryptoFlow-Notify', category: 'Blockchain', date: 'Jul 2025', color: '#9a3f52',
    hook: 'Every transaction has a story',
    desc: 'On-chain activity is difficult to follow when useful notifications are scattered. This article covers the motivation behind CryptoFlow-Notify: a wallet-connected alert workflow for transfers and governance events, using MetaMask, Solidity and live updates to make activity easier to follow.',
    image: 'assets/articles/cryptoflow-notify.svg',
    url: 'https://ruchirganatra.medium.com/why-i-built-cryptoflow-notify-3d434bdabdf9',
  },
];
