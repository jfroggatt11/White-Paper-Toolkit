# PDATF Toolkit

An interactive toolkit for exploring barrier themes and resources in the PDATF project. Built with React, Vite, and Recharts.

## Features
- Interactive donut chart visualization of themes and barriers
- Search and filter resources by title, description, tags, and personas
- Select inner (themes) or outer (barriers) ring segments to filter results
- Responsive design with sticky header and scrollable results pane
- Data sourced from Google Sheets and transformed at build time

## Tech Stack
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)
- [TailwindCSS](https://tailwindcss.com/) for styling

## Development

### Install dependencies
```bash
npm install

Run locally

npm run dev

Build for production

npm run build

Preview production build

npm run preview

Deployment

This project is configured for deployment on Netlify.
	•	Build command: npm run build
	•	Publish directory: dist

For single-page app routing, include a _redirects file in public/ with:

/*  /index.html  200

Environment Variables

At build time, the script scripts/build-data.mjs fetches data from published Google Sheets.

Set these environment variables in Netlify or your local .env file:
	•	RESOURCES_CSV_URL
	•	BARRIER_THEMES_CSV_URL
	•	BARRIERS_CSV_URL

License

MIT License

