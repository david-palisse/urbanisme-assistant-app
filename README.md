# Assistant Urbanisme - Urban Planning Assistant

## Overview

Assistant Urbanisme is an intelligent application that simplifies urban planning procedures for individuals in France. The application helps users navigate the complex administrative process of obtaining construction permits by analyzing their projects against local urban planning regulations (PLU/PLUi).

### What it Does

1. **Describe your construction project** - Guided questionnaire to capture project details (type, dimensions, location)
2. **Verify regulatory compatibility** - Automatically analyze local urban planning rules
3. **Determine required authorization type** - Identify whether you need a Déclaration Préalable (DP), Permis de Construire (PC), or Permis d'Aménager (PA)
4. **Generate personalized document checklist** - Get a complete list of required documents for your application

## Features

- ✅ **Project Qualification** - Guided questionnaire through a step-by-step wizard
- ✅ **Address Geocoding** - Convert addresses to coordinates using BAN (Base Adresse Nationale)
- ✅ **PLU/PLUi Analysis** - Fetch and analyze urban planning zone regulations
- ✅ **Authorization Type Determination** - Automatic classification (DP/PC/PA)
- ✅ **Document Checklists** - Personalized required documents based on project type
- ✅ **User Authentication** - Secure account management with JWT
- ✅ **Project Management** - Save, view, and manage multiple projects

### Supported Project Types (V1)

- Swimming pools (in-ground, above-ground)
- Extensions (single-story)
- Garden sheds / Annexes
- Fences / Gates
- Facade modifications

## Tech Stack

### Backend
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with Passport.js
- **API Documentation:** Swagger/OpenAPI
- **LLM Integration:** OpenAI GPT-4o (optional)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom components with shadcn/ui patterns
- **State Management:** React Context API

### Infrastructure
- **Database:** PostgreSQL 15 (via Docker)
- **Cache:** Redis 7 (via Docker, optional)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (comes with Node.js)
- **Docker** and **Docker Compose** (for running PostgreSQL and Redis)
- **Git** for version control

Optional:
- **OpenAI API key** - Required for LLM-powered analysis features

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd assistant_urbanisme_app
```

### 2. Start the Database

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on `localhost:5432` (user: urbanisme, password: urbanisme_password, database: urbanisme)
- **Redis** on `localhost:6379` (optional caching)

Verify the services are running:

```bash
docker-compose ps
```

### 3. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your settings (especially JWT_SECRET and OPENAI_API_KEY)
# nano .env or use your preferred editor

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

The backend will be available at:
- **API:** http://localhost:3001/api
- **Swagger Docs:** http://localhost:3001/api/docs

### 4. Setup Frontend

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Copy environment file
cp .env.local.example .env.local

# Verify NEXT_PUBLIC_API_URL is set correctly (should be http://localhost:3001/api)
# nano .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at:
- **Application:** http://localhost:3000

### 5. Verify Installation

1. Open http://localhost:3000 in your browser
2. Click "Créer un compte" to register a new account
3. Login with your credentials
4. Create a new project to test the full workflow

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://urbanisme:urbanisme_password@localhost:5432/urbanisme` |
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `JWT_EXPIRES_IN` | JWT token expiration | No | `7d` |
| `OPENAI_API_KEY` | OpenAI API key for LLM features | No | - |
| `OPENAI_MODEL` | OpenAI model to use | No | `gpt-4o` |
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Backend server port | No | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | No | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `http://localhost:3001/api` |

## Project Structure

```
assistant_urbanisme_app/
├── backend/                    # NestJS Backend
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── common/             # Shared utilities and decorators
│   │   ├── config/             # Configuration module
│   │   ├── modules/
│   │   │   ├── analysis/       # Project analysis endpoints
│   │   │   ├── auth/           # Authentication (register, login)
│   │   │   ├── documents/      # Document checklist endpoints
│   │   │   ├── geocoding/      # Address geocoding (BAN API)
│   │   │   ├── projects/       # Project CRUD operations
│   │   │   ├── questionnaire/  # Questionnaire flow
│   │   │   └── urbanisme/      # PLU/urbanisme data endpoints
│   │   ├── prisma/             # Prisma service
│   │   ├── app.module.ts       # Root module
│   │   └── main.ts             # Application entry point
│   └── package.json
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Authentication pages
│   │   │   ├── dashboard/      # Dashboard layout
│   │   │   ├── projects/       # Project pages
│   │   │   └── page.tsx        # Landing page
│   │   ├── components/
│   │   │   ├── auth/           # Auth forms
│   │   │   ├── layout/         # Layout components
│   │   │   ├── projects/       # Project components
│   │   │   ├── questionnaire/  # Questionnaire components
│   │   │   ├── results/        # Analysis results components
│   │   │   └── ui/             # Reusable UI components
│   │   ├── lib/                # Utilities and context
│   │   └── types/              # TypeScript type definitions
│   └── package.json
│
├── docker-compose.yml          # Docker services configuration
├── scripts/                    # Utility scripts
│   └── setup.sh                # Full setup script
└── README.md                   # This file
```

## API Endpoints

Full API documentation is available at http://localhost:3001/api/docs when the backend is running.

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/projects` | List user projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project details |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/questionnaire/questions` | Get questionnaire flow |
| POST | `/api/questionnaire/:projectId` | Save questionnaire responses |
| GET | `/api/geocoding/search` | Search addresses |
| POST | `/api/analysis/:projectId` | Run project analysis |
| GET | `/api/documents/:projectId` | Get document checklist |

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

### Database Management

```bash
# View database in Prisma Studio
cd backend
npm run prisma:studio

# Create a new migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset database (delete volume)
docker-compose down -v
```

## Troubleshooting

### Common Issues

**Backend fails to connect to database**
- Ensure Docker containers are running: `docker-compose ps`
- Check DATABASE_URL in `.env` matches docker-compose configuration
- Verify PostgreSQL is healthy: `docker-compose logs postgres`

**Frontend shows API connection errors**
- Verify backend is running at http://localhost:3001
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Ensure CORS is properly configured (FRONTEND_URL in backend `.env`)

**Prisma errors**
- Run `npm run prisma:generate` after schema changes
- Run `npm run prisma:migrate` to apply migrations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Write tests for new features

## Legal Disclaimer

> **Avertissement** : Cette application fournit des informations à titre indicatif uniquement.
> Elle ne constitue pas un conseil juridique et ne garantit pas l'obtention d'une autorisation d'urbanisme.
> Seule la décision du service instructeur de votre mairie fait foi.
> Nous vous recommandons de consulter le service urbanisme de votre commune pour confirmer la faisabilité de votre projet.

This application provides informational guidance only. It does not constitute legal advice and does not guarantee the approval of any urban planning authorization. Only the decision from your local municipality's planning department is legally binding. We recommend consulting your local urban planning office to confirm your project's feasibility.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [BAN (Base Adresse Nationale)](https://adresse.data.gouv.fr/) for address geocoding
- [Géoportail de l'Urbanisme](https://www.geoportail-urbanisme.gouv.fr/) for PLU data
- [OpenAI](https://openai.com/) for LLM capabilities
