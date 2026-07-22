# Rolando — Portfolio

A personal portfolio site for **Rolando**, web developer. Hand-built with plain
HTML, CSS and JavaScript — no frameworks, no build step.

## Design
- **Editorial / warm-Swiss** aesthetic: warm paper background, near-black ink,
  a single vermilion accent. Deliberately not a generic template look.
- Type: **Fraunces** (display) · **Inter** (body) · **JetBrains Mono** (labels).
- Light **and** dark theme (respects your system, remembers your choice).
- Fully responsive, keyboard-accessible, respects reduced-motion.

## Run it
It's static — just open `index.html`, or serve the folder:

```bash
# any one of these
npx serve .
python -m http.server 5173
# then visit http://localhost:5173
```

## Make it yours (2 quick steps)
1. **Photo** — put your portrait at `assets/rolando.jpg`.
   No photo? The site shows a clean "R" monogram automatically.
2. **CV** — put your PDF at `assets/CV-Rolando.pdf` so the *Download CV* buttons work.

Everything else (text, projects, links) already reflects your CV. To edit copy,
open `index.html` — sections are clearly labelled with comments.

## Structure
```
New-Portfolio/
├─ index.html        # all content, section by section
├─ css/style.css     # design system + components + responsive
├─ js/main.js        # theme, nav, scroll reveal, live clock, copy-email
└─ assets/           # your photo + CV go here
```

## Deploy (free)
- **GitHub Pages** — push this folder, enable Pages on the `main` branch.
- **Netlify / Vercel** — drag-and-drop the folder, done.

---
Contact: andorolandowork@gmail.com ·
[LinkedIn](https://www.linkedin.com/in/rolando-rolando-65038b229/)
