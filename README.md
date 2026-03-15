# habit.grid 🟩

A GitHub-style contribution grid habit tracker. Track your daily habits and watch your grid turn green.

## Features

- **CRUD** — Create, edit, and delete habits with emoji + name + description
- **Contribution grid** — GitHub-style heatmap per habit (20 weeks)
- **Intensity levels** — More repetitions = greener squares (4 levels)
- **Date selection** — Click any square to log past dates
- **Streak tracking** — Current streak, daily count, total contributions
- **Persistent** — Data saved in localStorage

## Quick start

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
```

The `dist/` folder is a static site — serve it with nginx, Caddy, or any static host.

### Example nginx config

```nginx
server {
    listen 80;
    server_name habits.yourdomain.com;
    root /var/www/habit-grid/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Deploy steps (VPS)

```bash
# On your local machine
npm run build
scp -r dist/* user@your-vps:/var/www/habit-grid/dist/

# Or push to GitHub and pull from your VPS
git add .
git commit -m "initial commit"
git push origin main

# On your VPS
cd /var/www/habit-grid
git pull
npm install
npm run build
```

## Tech

- React 18 + Vite
- Zero dependencies beyond React
- ~500 lines of code
- localStorage for persistence
