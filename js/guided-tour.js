// First-person authored tour of the actual room. No teleport/cut to third-person.
// All locations are in the 10 × 10 metre room floor plan (x, z).
// Narration references the same portfolio records as the drawer and chat.
const short = (s, n = 38) => String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || '');

export function guidedTourPlan({ profile, projects, workbench, certificates, articles }) {
  const projectNames = projects.slice(0, 2).map(p => p.title).filter(Boolean);
  const named = projectNames.length === 2
    ? short(projectNames[0]) + ' and ' + short(projectNames[1])
    : short(projectNames[0] || 'his featured work');
  // Each stop uses a safe standing position, a visible focal target and a separate NPC guide location.
  // Extra route points keep the first-person walkthrough out of furniture.
  return [
    {
      id: 'welcome', title: 'Welcome to the room', seconds: 5.8,
      pos: [3.9, 2.95], look: [3.6, 2.65, 1.35], guide: [3.6, 1.35],
      say: 'Hey, welcome to ' + profile.name + "'s room! I'm Dev, your guide. I'll show you his work, then you'll be free to explore everything yourself.",
    },
    {
      id: 'hallway', title: 'Walk with Dev', seconds: 4.0,
      pos: [3.7, 0.3], look: [3.0, 2.5, -3.9], guide: [3.7, -0.5],
      say: 'Follow me. Everything you see here is part of Ruchir’s real portfolio, not just decoration.',
    },
    {
      id: 'projects', title: 'Featured projects', seconds: 6.4,
      pos: [3.12, -2.35], look: [3.0, 2.7, -4.58], guide: [2.4, -2.75],
      say: 'This shelf holds projects built by Ruchir, including ' + named + '. After the tour, select a project to read the story and open its links.',
    },
    {
      id: 'workbench', title: 'Experiments and tools', seconds: 4.8,
      pos: [1.47, -1.5], look: [3.2, 1.9, -4.4], guide: [1.15, -0.7],
      say: 'The workbench also contains ' + workbench.length + ' smaller tools and analyses. These are practical systems he designed, tested and improved.',
    },
    {
      id: 'desk', title: 'The creative desk', seconds: 5.2,
      pos: [1.43, -0.35], look: [-0.75, 2.45, -1.85], guide: [0.0, -0.15],
      say: "Here's his desk. This is where data ideas, dashboards, and applications take shape. There are also " + articles.length + ' articles you can read.',
    },
    {
      id: 'corridor', title: 'Meet Ruchir', seconds: 3.9,
      pos: [-1.95, 0.14], look: [-3.17, 2.55, -2.5], guide: [-2.7, -0.35],
      say: 'And there’s Ruchir. Walk up and talk to him later to learn about his experience, interests and work.',
    },
    {
      id: 'certificates', title: 'Certificates', seconds: 5.8,
      pos: [-3.37, -0.13], look: [-4.9, 3.6, 0.08], guide: [-3.35, 0.86],
      say: 'This wall displays ' + certificates.length + ' of his certificates. You can open the originals and see what he learned from each.',
    },
    {
      id: 'secrets', title: 'Interactive room', seconds: 5.8,
      pos: [-3.52, 1.33], look: [-4.52, 1.95, 2.25], guide: [-3.12, 2.48],
      say: 'The room is interactive too. Find the record player, the cat, the lamp, and the little objects with stories hidden inside.',
    },
    {
      id: 'whiteboard', title: 'Skills and contact', seconds: 5.8,
      pos: [-1.1, 3.78], look: [1.4, 3.4, 4.95], guide: [-0.2, 3.6],
      say: "The whiteboard shows Ruchir's skills. You can also explore his background and find ways to contact him from the navigation.",
    },
    {
      id: 'return', title: 'Back to the entrance', seconds: 4.6,
      pos: [3.76, 4.03], look: [3.1, 2.55, 2.4], guide: [3.85, 3.05],
      say: 'That’s the tour. We’re heading back to the entrance, where you can explore at your own pace.',
    },
    {
      id: 'ready', title: 'You are in control', seconds: 4.4,
      pos: [3.9, 2.95], look: [3.6, 2.6, 1.35], guide: [3.6, 1.35],
      say: 'And that's the full tour! I'm handing over control now. Use W, A, S, D to walk, the mouse to look around, and E to interact. Have fun!',
    },
  ];
}
