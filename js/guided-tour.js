// Cinematic first-person introduction to the actual portfolio.
// Narration draws from the same published content as the interactive drawers.
// The route is deliberately ordered through collision-checked floor positions.
const short = (s, max = 40) => {
  const value = String(s || '');
  return value.length <= max ? value : value.slice(0, max - 1) + '…';
};
const readingTime = (text, minimum = 5) =>
  Math.max(minimum, Math.ceil(String(text).trim().split(/\s+/).length / 2.8 + 1.7));

export function guidedTourPlan({ profile, projects, workbench, certificates, articles }) {
  const work = Array.isArray(profile.experience) ? profile.experience[0] : null;
  const school = Array.isArray(profile.education) ? profile.education[0] : null;
  const skillNames = Object.values(profile.skills || {}).flat();
  const focusSkills = ['Python', 'SQL', 'Power BI', 'React', 'FastAPI', 'Pandas']
    .filter(name => skillNames.includes(name));
  const topProjects = projects.slice(0, 2).map(p => short(p.title, 26));

  const steps = [
    {
      id: 'welcome', title: 'Welcome to Ruchir’s Room', category: 'WELCOME',
      pos: [3.9, 2.95], look: [3.6, 2.63, 1.35], guide: [1.19, 2.25],
      minimum: 8, tags: ['Cinematic tour', 'First-person experience'],
      say: "Hi there. I'm Mira, your guide. Welcome to Ruchir Ganatra's room. Every wall and shelf tells part of his story. I'll show you around first, and then you can explore freely.",
    },
    {
      id: 'about', title: 'Meet Ruchir Ganatra', category: 'ABOUT RUCHIR',
      pos: [3.7, 0.3], look: [-0.75, 2.6, -1.85], guide: [3.16, -1.26],
      minimum: 10, image: profile.photo,
      tags: ['Ahmedabad', 'Data & Digital Systems Analyst', 'Information Technology'],
      say: "This is Ruchir Ganatra, based in Ahmedabad. He works as a " +
        (work?.title || profile.role) + (school ? ", and studies " + school.title + " at " + school.where + "." : ".") +
        " His focus is turning complicated information into practical systems people can actually use.",
    },
    {
      id: 'tools', title: 'The tools he uses', category: 'TECHNICAL SKILLS',
      pos: [3.12, -2.35], look: [1.4, 3.45, 4.94], guide: [1.63, -3.53],
      minimum: 10, tags: focusSkills,
      say: "Let's start with his toolkit. Ruchir uses " +
        focusSkills.slice(0, 3).join(', ') + ", alongside web development tools like React and FastAPI. He also works with analytics, machine learning and data visualisation. The whiteboard holds the fuller list.",
    },
    {
      id: 'projects', title: 'Projects built by Ruchir', category: 'FEATURED PROJECTS',
      pos: [1.47, -1.5], look: [3.05, 2.4, -4.55], guide: [1.88, 0.35],
      minimum: 10, tags: topProjects,
      say: "Now for the projects. Every featured build here was made by Ruchir. Among them are " +
        topProjects.join(' and ') +
        ". You can inspect each project after the tour, explore its technology stack, and open the live app or source code.",
    },
    {
      id: 'workbench', title: 'His workbench', category: 'EXPERIMENTS',
      pos: [1.43, -0.35], look: [3.15, 1.95, -4.5], guide: [-0.47, -0.27],
      minimum: 8, tags: [workbench.length + ' tools & experiments', 'Problem solving'],
      say: "Beyond the main projects, the workbench contains " +
        workbench.length + " additional tools and experiments. They show how Ruchir approaches real-world problems, tests ideas, and keeps refining what he builds.",
    },
    {
      id: 'articles', title: 'Writing and ideas', category: 'ARTICLES',
      pos: [-1.95, 0.14], look: [-0.4, 2.05, -1.95], guide: [-3.48, -0.99],
      minimum: 8, tags: [articles.length + ' articles', 'Learning in public'],
      say: "Over here is his desk. Ruchir also shares what he learns through " +
        articles.length + " articles. You can pick one up, read the story, and visit the original publication.",
    },
    {
      id: 'certificates', title: 'Certificates and learning', category: 'ACHIEVEMENTS',
      pos: [-3.37, -0.13], look: [-4.90, 3.63, 0.08], guide: [-2.48, 1.26],
      minimum: 9, tags: [certificates.length + ' certificates', 'Google', 'IBM', 'Kaggle'],
      say: "This is his achievement wall, featuring " +
        certificates.length + " certificates. They cover subjects including analytics, artificial intelligence, Python, and cloud computing. Open any frame later to see its details and original document.",
    },
    {
      id: 'interactive', title: 'A room you can interact with', category: 'ROOM DETAILS',
      pos: [-3.52, 1.33], look: [-4.52, 2.0, 2.25], guide: [-2.95, 3.14],
      minimum: 8, tags: ['Record player', 'Desk lamp', 'The cat'],
      say: "There's more than a portfolio here. The record player, the desk lamp, the cat and other small objects all respond when you interact. Some even have hidden surprises.",
    },
    {
      id: 'contact', title: 'Experience and contact', category: 'WORK & CONTACT',
      pos: [-1.1, 3.78], look: [1.4, 3.35, 4.95], guide: [0.69, 3.13],
      minimum: 9, tags: ['Experience', 'Résumé', 'Get in touch'],
      say: "That brings us to Ruchir's experience, education and contact details. The navigation lets you revisit any section, download his résumé, or get in touch about a project.",
    },
    {
      id: 'return', title: 'Your story begins here', category: 'FINAL STOP',
      pos: [3.76, 4.03], look: [3.1, 2.55, 2.4], guide: [2.11, 3.94],
      minimum: 5, tags: ['Almost ready'],
      say: "We're back at the entrance. In a moment, this entire room is yours to explore.",
    },
    {
      id: 'ready', title: 'Free exploration unlocked', category: 'YOUR TURN',
      pos: [3.9, 2.95], look: [3.6, 2.6, 1.35], guide: [1.19, 2.25],
      minimum: 7, tags: ['WASD to move', 'Mouse to look', 'E to interact'],
      say: "That's the tour. Now take control: click Start Exploring to capture your mouse, walk with W, A, S and D, and use E to interact with anything you discover. Enjoy!",
    },
  ];
  // Two independently spoken beats per scene: Mira's face first, then the subject.
  // Keep the original full narration as data but schedule each beat with its shot.
  return steps.map(step => {
    const sentences = step.say.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(x => x.trim()).filter(Boolean) || [step.say];
    const first = sentences[0] || step.say;
    const second = sentences.slice(1).join(' ').trim();
    const hasReveal = !['welcome', 'return', 'ready'].includes(step.id) && !!second;
    const faceWords = first.split(/\s+/).length;
    const restWords = second.split(/\s+/).length;
    const beatSwitch = hasReveal
      ? Math.max(0.39, Math.min(0.58, faceWords / Math.max(1, faceWords + restWords) + 0.1))
      : 1;
    return {
      ...step, seconds: readingTime(step.say, step.minimum),
      speakerSay: hasReveal ? first : step.say,
      exhibitSay: hasReveal ? second : '',
      beatSwitch,
    };
  });
}
