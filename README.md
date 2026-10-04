# Smart Fuel Rationing and Optimization System

A comprehensive system to manage fuel quotas, inventory, priority allocation, and government analytics.
Built for Team Aira (Team No. SNPSU49).

## Architecture

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, Lucide React, Recharts, Leaflet.
- **Backend**: Node.js + Express + TypeScript, Prisma ORM, Zod validation.
- **Database**: PostgreSQL
- **Testing**: Vitest for unit/integration, Playwright for E2E.
- **Monorepo**: Managed via npm workspaces (`frontend`, `backend`, `shared`).

## Prerequisites

- Node.js (v18+)
- PostgreSQL (running locally or remote)

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment Variables**:
   - Navigate to `backend/` and copy `.env.example` to `.env`.
   - Update `DATABASE_URL` with your actual PostgreSQL credentials.

3. **Database Setup**:
   - Navigate to `backend/`
   - Run \`npx prisma db push\` (or \`npx prisma migrate dev\`) to create tables.
   - Run \`npx prisma generate\` to build the Prisma Client.

4. **Run the application**:
   - From the root directory, you can run both simultaneously:
     \`\`\`bash
     npm run dev
     \`\`\`

   - Or individually:
     - Frontend: \`cd frontend && npm run dev\`
     - Backend: \`cd backend && npm run dev\`

## Features (Planned)

- Fuel quotas management
- Petrol station inventory and reservation
- QR-based fuel dispensing
- Essential-service priority allocation
- Anti-hoarding alerts
- Government analytics dashboard
