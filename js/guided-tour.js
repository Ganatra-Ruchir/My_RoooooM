// Cinematic, conversational two-beat narration for the same interactive room.
// Each scene has a spoken introduction (Mira on camera) and, where useful,
// a reveal line (camera pans to the item she is describing).
// Keep factual claims grounded in js/data.js; never invent achievements.
const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const duration = (text, minimum = 5) =>
  !text ? 0 : Math.max(minimum, Math.ceil(words(text) / 2.55 + 1.2));

export function guidedTourPlan({ profile, projects, workbench, certificates, articles }) {
  const projectNames = projects.slice(0, 2).map(p => p.title);
  const exhibits = {
    docs: projectNames.find(s => /DocuSense/i.test(s)) || projectNames[0] || 'DocuSense AI',
    security: projectNames.find(s => /SkyRecon/i.test(s)) || projectNames[1] || 'SkyRecon',
  };
  const steps = [
    {
      id: 'welcome', title: 'Welcome to Ruchir’s Room', category: 'WELCOME',
      pos: [3.9, 2.95], look: [3.6, 2.63, 1.35], guide: [1.19, 2.25],
      tags: ['First-person experience', 'Meet the creator'],
      speakerSay: "Hey, welcome in! I'm Mira, and I'll show you around Ruchir's room.",
      exhibitSay: '',
      outroSay: "This isn't an ordinary portfolio. Each part of the room has something to show you. Come on, let me introduce you.",
    },
    {
      id: 'about', title: 'Meet Ruchir Ganatra', category: 'ABOUT RUCHIR',
      pos: [3.7, 0.3], look: [-0.75, 2.6, -1.85], guide: [3.16, -1.26],
      image: profile.photo,
      tags: ['Ahmedabad', 'Information Technology', 'Digital systems'],
      speakerSay: "See the person over there? That's Ruchir Ganatra—the one who built all this.",
      exhibitSay: "He's from Ahmedabad and studies Information Technology. He works with real programme data, creates dashboards, and builds apps that make complicated information easier to use.",
    },
    {
      id: 'tools', title: 'The tools he uses', category: 'TECHNICAL SKILLS',
      pos: [3.12, -2.35], look: [1.4, 3.45, 4.94], guide: [1.63, -3.53],
      tags: ['Python', 'SQL', 'Power BI', 'React', 'Data visualization'],
      speakerSay: "See that board? Those are the tools behind his work.",
      exhibitSay: "Python and SQL help him make sense of data. He uses Power BI and Plotly to show what the numbers mean, and JavaScript and React to turn ideas into working applications.",
    },
    {
      id: 'projects', title: 'Projects built by Ruchir', category: 'FEATURED PROJECTS',
      pos: [1.47, -1.5], look: [3.05, 2.4, -4.55], guide: [1.88, 0.35],
      tags: [exhibits.docs, exhibits.security],
      speakerSay: "Now, here's my favorite part. These aren't just designs on a shelf.",
      exhibitSay: exhibits.docs + " lets you ask questions about documents while keeping the files on your device. " +
        exhibits.security + " brings security alerts and threat signals into one dashboard. You can try the live projects yourself later.",
    },
    {
      id: 'workbench', title: 'His workbench', category: 'EXPERIMENTS',
      pos: [1.43, -0.35], look: [3.15, 1.95, -4.5], guide: [-0.47, -0.27],
      tags: [workbench.length + ' experiments', 'Dashboards', 'Everyday tools'],
      speakerSay: "And he doesn't stop at the big projects. Take a look here.",
      exhibitSay: "This is his workbench, where he tries smaller ideas and solves everyday problems. You'll find things like data trackers, analytical dashboards, and tools made to save people time.",
    },
    {
      id: 'articles', title: 'Writing and ideas', category: 'ARTICLES',
      pos: [-1.95, 0.14], look: [-0.4, 2.05, -1.95], guide: [-3.48, -0.99],
      tags: [articles.length + ' articles', 'Thoughts and lessons'],
      speakerSay: "Over by the desk, there's another side to what he does.",
      exhibitSay: "Ruchir writes about his projects and the things he learns while building them. If you're curious about the thinking behind a project, this is a good place to start.",
    },
    {
      id: 'certificates', title: 'Certificates and learning', category: 'ACHIEVEMENTS',
      pos: [-3.37, -0.13], look: [-4.90, 3.63, 0.08], guide: [-2.48, 1.26],
      tags: [certificates.length + ' certificates', 'Google', 'IBM', 'Kaggle'],
      speakerSay: "See those frames on the wall? They're not just decoration.",
      exhibitSay: "They show what he's been learning—from Google Analytics and Python to artificial intelligence and cloud computing. You can open any certificate and look at the original.",
    },
    {
      id: 'interactive', title: 'A room you can interact with', category: 'ROOM DETAILS',
      pos: [-3.52, 1.33], look: [-4.52, 2.0, 2.25], guide: [-2.95, 3.14],
      tags: ['Record player', 'Lamp', 'The cat'],
      speakerSay: "Oh, and there's something else you should know.",
      exhibitSay: "You don't have to just look around. Try switching on the lamp, playing with the record player, or saying hello to the cat. There are little surprises hidden around the room.",
    },
    {
      id: 'contact', title: 'Experience and contact', category: 'WORK & CONTACT',
      pos: [-1.1, 3.78], look: [1.4, 3.35, 4.95], guide: [0.69, 3.13],
      tags: ['Experience', 'Résumé', 'Contact'],
      speakerSay: "And if you see something that sparks an idea, you can reach out to him.",
      exhibitSay: "His résumé, experience, and links are all here. He's interested in practical dashboards, reporting systems, and digital tools that make a real difference.",
    },
    {
      id: 'return', title: 'Your story begins here', category: 'FINAL STOP',
      pos: [3.76, 4.03], look: [3.1, 2.55, 2.4], guide: [2.11, 3.94],
      tags: ['Almost ready'],
      speakerSay: "You've seen the highlights. Let's head back to the entrance.",
      exhibitSay: '',
    },
    {
      id: 'ready', title: 'Free exploration unlocked', category: 'YOUR TURN',
      pos: [3.9, 2.95], look: [3.6, 2.6, 1.35], guide: [1.19, 2.25],
      tags: ['Mouse to look', 'WASD to move', 'E to interact'],
      speakerSay: "That's my tour. Now it's your turn!",
      exhibitSay: '',
      outroSay: "Click Start Exploring, move your mouse to look around, use W, A, S, and D to walk, and press E when something catches your eye. Have fun!",
    },
  ];

  return steps.map(step => {
    // Single-shot scenes still use the original speaker camera. Add the outro
    // to their single voice beat rather than silently losing half the lines.
    const speakerSay = step.outroSay
      ? step.speakerSay + ' ' + step.outroSay
      : step.speakerSay;
    const exhibitSay = step.exhibitSay || '';
    const speakerSeconds = duration(speakerSay, 6);
    const exhibitSeconds = duration(exhibitSay, 7);
    const seconds = speakerSeconds + exhibitSeconds + 1.6;
    return {
      ...step, speakerSay, exhibitSay, say: [speakerSay, exhibitSay].filter(Boolean).join(' '),
      seconds,
      beatSwitch: exhibitSay ? (speakerSeconds + 0.7) / seconds : 1,
    };
  });
}
