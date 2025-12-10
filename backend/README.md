# Urban Planning Assistant - Backend API

Backend API for the Urban Planning Assistant application built with NestJS and TypeScript.

## Technology Stack

- **Framework**: NestJS v10+
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **External APIs**: BAN (geocoding), Cadastre, GPU (urban planning)
- **LLM Integration**: OpenAI GPT-4o

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. **Clone the repository and navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run start:dev
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRES_IN` | Token expiration time (e.g., "7d") | No |
| `OPENAI_API_KEY` | OpenAI API key for LLM analysis | No* |
| `OPENAI_MODEL` | OpenAI model to use (default: gpt-4o) | No |
| `PORT` | Server port (default: 3001) | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

*If not provided, the analysis feature will use mock responses.

## API Documentation

When the server is running, access the Swagger documentation at:
```
http://localhost:3001/api/docs
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start the server |
| `npm run start:dev` | Start the server in watch mode |
| `npm run start:debug` | Start with debugging |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build the project |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (authenticated)

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Questionnaire
- `GET /api/questionnaire/questions/:projectType` - Get questions for project type
- `POST /api/projects/:id/questionnaire` - Save questionnaire responses
- `GET /api/projects/:id/questionnaire` - Get saved responses

### Geocoding
- `POST /api/geocoding/search` - Search address using BAN API
- `GET /api/geocoding/parcel` - Get parcel info from coordinates

### Urban Planning
- `GET /api/urbanisme/zone` - Get PLU zone information

### Analysis
- `POST /api/projects/:id/analyze` - Trigger LLM analysis
- `GET /api/projects/:id/analysis` - Get analysis results

### Documents
- `GET /api/projects/:id/documents` - Get required documents checklist

## Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── config/
│   │   └── configuration.ts    # Environment configuration
│   ├── common/
│   │   └── filters/            # Global exception filters
│   ├── prisma/
│   │   ├── prisma.module.ts    # Prisma module
│   │   └── prisma.service.ts   # Prisma service
│   └── modules/
│       ├── auth/               # Authentication module
│       ├── projects/           # Projects CRUD module
│       ├── questionnaire/      # Questionnaire module
│       ├── geocoding/          # BAN API integration
│       ├── urbanisme/          # GPU API integration
│       ├── analysis/           # OpenAI LLM analysis
│       └── documents/          # Document checklist module
├── prisma/
│   └── schema.prisma           # Database schema
├── test/
│   └── ...                     # Test files
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Supported Project Types

The API supports the following construction project types:

| Type | Code | Description |
|------|------|-------------|
| Pool | `POOL` | In-ground or above-ground swimming pools |
| Extension | `EXTENSION` | House extensions (single-story) |
| Garden Shed | `SHED` | Garden sheds and annexes |
| Fence | `FENCE` | Fences and gates |

## Authorization Types

Based on the analysis, projects may require:

| Type | Code | Description |
|------|------|-------------|
| None | `NONE` | No authorization required |
| Prior Declaration | `DP` | Déclaration Préalable |
| Building Permit | `PC` | Permis de Construire |
| Development Permit | `PA` | Permis d'Aménager |

## External APIs Used

### BAN (Base Adresse Nationale)
- Endpoint: `https://api-adresse.data.gouv.fr/search/`
- Purpose: Address geocoding

### Cadastre (Etalab)
- Endpoint: `https://apicarto.ign.fr/api/cadastre/parcelle`
- Purpose: Parcel identification

### GPU (Géoportail Urbanisme)
- Endpoint: `https://apicarto.ign.fr/api/gpu/zone-urba`
- Purpose: PLU zone information

## Error Handling

The API returns consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

## Legal Notice

This application provides advisory assistance only. Analysis results are indicative and do not guarantee the granting of any urban planning authorization. Only the municipal decision is legally binding.

## License

MIT
