# KCD Scorekeeper

A simple scorekeeper for Kingdom Come: Deliverance dice game, with user registration, login, and SQLite persistence.

## Features
- User Authentication (JWT)
- Multiple Players
- Win condition tracking
- SQLite database persistence

## Setup

### Prerequisites
- Node.js (v18+)

### Installation
From the root directory:
```bash
# To install everything
npm run install-all

# OR manually if above fails on your system:
npm install --prefix src/backend
npm install --prefix src/frontend
```

### Development
1. Start the backend:
   ```bash
   npm run start-backend
   ```
2. Start the frontend:
   ```bash
   npm run dev-frontend
   ```
3. Open `http://localhost:5173` in your browser.

### Deployment (Single Server)
1. Build the frontend:
   ```bash
   npm run build-frontend
   ```
2. Run the backend (which now serves the built frontend):
   ```bash
   npm run start-backend
   ```
3. The app will be available at `http://localhost:3001`.

## Troubleshooting
If `npm run install-all` fails, it might be due to your shell not supporting `&&`. Try running the install commands for backend and frontend separately as shown in the Installation section.
