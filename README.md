# My RoooooM — Ruchir Ganatra's room portfolio

A small first-person game in the browser. You walk into Ruchir's room, look around, and everything you see is part of his portfolio: certificates framed on the wall, projects on the bookshelf, articles as journals on the desk, and Ruchir himself at his desk, who you can walk up to and talk to.

## How to play

Press **Click to play**. The page goes full screen and locks the mouse so you look around like a PC game.

| Desktop | Phone / tablet |
| --- | --- |
| **W S** or **↑ ↓** walk, **A D** sidestep | Joystick walks (push far to run) |
| **Mouse** or **← →** look / turn | Drag the screen to look around |
| **Shift** run | |
| **E** or **click** to interact with what the **＋** points at | **✋** button to interact |
| Click the floor to walk there | Tap the floor to walk there |
| **Esc** pause and free the mouse, **F** full screen | |

If the browser doesn't allow mouse lock (for example when the page is embedded), you can drag with the mouse to look around instead.

## Talk to Ruchir

Walk up to Ruchir at his desk and press **E**. He looks up at you and a chat opens. Use the quick replies (Hi, What's your name?, What do you do?, Projects, Skills, Studies, Certificates, Articles, Contact, Something fun, Bye) or type your own question. Answers come only from the portfolio content in `js/data.js`; nothing is sent to any server or AI service.

## What's in the room

| In the room | Opens |
| --- | --- |
| Ruchir at the desk | Chat with Ruchir (and from there his full profile) |
| Framed certificates on the green wall | Certificate viewer with the original files |
| Boxed sets on the bookshelf | Featured projects: DocuSense AI, SkyRecon, Literacy Gap Analysis, Backstop, PDFly |
| Binders on the bookshelf | 10 smaller builds with live and source links |
| Journals on the desk | The 6 Medium articles (the laptop types out drafts on a loop) |
| "say hello" neon sign | Contact: email, résumé, links |
| Whiteboard by the door | Toolkit / skills |

### Room secrets (9 to find)

A counter in the top bar (✦ 0/9) tracks what a visitor has found; the list gives hints. Progress is saved in that visitor's browser.

| Thing | What it does |
| --- | --- |
| **Commit the cat** | Walks laps around the room and naps on the beanbag. Pet it (it purrs, hearts float up) or open GitHub. |
| **Record player** | Plays a lo-fi beat generated live in the browser (no audio files). |
| **Phone** on the desk | Buzzes with a "Let's connect?" message that leads to LinkedIn. |
| **Résumé clipboard** | Open or download the résumé PDF. |
| **Event lanyards** | Community work: Startup Mini Meetup, Ahmedabad Innovation Summit, FITAG Tech Expo 2026. |
| **Rubber duck** | Squeaks and shares one of Ruchir's working rules. |
| **Corner plant** | Water it and it grows ("growth mindset"). |
| **Window** | Switches day and night. |
| **Desk lamp** | Switches the lamp on and off. |

Also: the room follows the time in India (night from 7 pm to 6 am IST), the wall clock shows IST, and a **Text version** button shows everything as a normal page (it also appears automatically if WebGL isn't available).

## Using Ruchir's character art

Ruchir is a 3D character built from shapes, styled after his character art. To show the art itself as a life-size standee beside the desk (and in the chat header), save a **full-body image with a transparent background** as `assets/character.png` and set `character: 'assets/character.png'` in `profile` in [`js/data.js`](js/data.js). You can preview any image first with `?character=assets/your-image.png` in the URL.

## Run locally

It's a static site with no build step. From this folder:

```sh
python -m http.server 8000
```

Then open http://localhost:8000. You need an internet connection for the fonts (Google Fonts) and three.js (jsDelivr, pinned to 0.160.0). Opening `index.html` directly from disk won't work because browsers block ES modules on `file://`.

For testing, add `?debug` to the URL to get `room` and `ui` in the browser console; `room.simulate(seconds)` fast-forwards the room when a background tab is throttled.

## Deploy

Any static host works. On GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder. On Vercel: import the repo with the "Other" framework preset and no build command.

## Editing content

All text and links live in [`js/data.js`](js/data.js): `profile` (bio, experience, education, skills, links, character art), `certificates` (10 frames on the wall), `projects` (5 boxed sets), `workbench` (up to 10 binders) and `articles` (the journals).

## Files

```
index.html          page shell, fonts, three.js import map
css/style.css       UI around the 3D scene (day and night themes)
js/main.js          startup: fonts, WebGL check, loader, wiring
js/room.js          the 3D room, first-person camera, prompts, lights
js/player.js        the visitor's body and collisions with furniture
js/avatar.js        Ruchir's 3D character (typing, looks at you, waves)
js/chat.js          talking to Ruchir: quick replies and typed questions
js/controls.js      keyboard, mouse look and the touch joystick
js/extras.js        the cat, record player, phone, clipboard, lanyards, duck, plant
js/sound.js         synthesized sounds: lo-fi loop, purr, squeak, splash
js/textures.js      canvas-drawn textures: floor, spines, sky, neon, whiteboard
js/ui.js            panels, pop-up cards, secrets, start / pause screen, text version
js/data.js          all portfolio content
assets/             certificates, article art, photo, résumé
```

Content comes from the existing portfolio at [ruchirganatra-github-io.vercel.app](https://ruchirganatra-github-io.vercel.app/).
