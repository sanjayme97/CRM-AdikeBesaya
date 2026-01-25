# Fertilizer Tracker CRM

A React + TypeScript CRM application for managing agricultural sales leads, field visits, quotations, and payments. Uses Google Sheets as the database backend.

## Features

- **Lead Management** - Track potential customers with contact info, location, crop types, and status
- **Field Visits** - Log farm visits with observations, soil conditions, and recommendations
- **Quotations** - Create and manage sales quotes linked to leads and visits
- **Payments** - Track payment records against quotations
- **Dashboard** - Overview of key metrics and recent activities
- **Role-Based Access** - User permissions managed via Google Sheets

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (auth), React Query (server state)
- **Backend**: Google Sheets API, Google Visualization Query API
- **Authentication**: Google OAuth 2.0

## Prerequisites

- Node.js 18+
- Google Cloud Project with Sheets API enabled
- Google OAuth 2.0 credentials
- Google Apps Script deployed (for ID generation)

## Setup

1. **Clone and install dependencies**
   ```bash
   cd fertilizer-tracker
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Fill in your `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
   VITE_APPS_SCRIPT_URL=your-deployed-apps-script-url
   ```

3. **Set up Google Sheets**
   - Create a Google Sheet with the required sheets (Leads, FieldVisits, Quotations, Payments, Lookups, Roles)
   - Deploy the Apps Script from `google-apps-script/` folder to initialize schemas
   - See `docs/google-cloud-setup.md` for detailed instructions

4. **Run development server**
   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/     # Modal forms and shared components
├── hooks/          # Custom React hooks
├── pages/          # Page components (Dashboard, Leads, etc.)
├── services/       # API services (sheets, auth, tokens)
├── store/          # Zustand stores
├── types/          # TypeScript interfaces
└── utils/          # Utility functions
```

## Documentation

- [Google Cloud Setup](../docs/google-cloud-setup.md)
- [Implementation Status](../docs/implementation-status.md)
- [Setup Checklist](../docs/SETUP_CHECKLIST.md)

## License

Private - All rights reserved
