# AGENTS.md

## Persistent Project Guidelines & Multi-Project Context

### 📱 Android Grocery Shopping App Integration (Companion Project)
- **Role**: This server & database (`AI-Recipes` / `Stones Recipes`) acts as the central backend API and persistent database for **both**:
  1. This Web Recipe Application.
  2. The separate **Android Grocery Shopping App** project.
- **Database & Migration Strategy**:
  - The SQLite database lives in `user_data/app.db` via Prisma (`prisma/schema.prisma`).
  - Database schema updates for the Android Grocery App will be applied seamlessly to the live server via the built-in OTA update script (`./update.sh` / `npx prisma db push`).
- **Authentication for Mobile Clients**:
  - Mobile clients authenticate using `POST /api/auth/login` (or `/api/auth/register`) to receive a session token.
  - Subsequent requests pass the session token in the `x-session-token` header (or `?token=...` query param).
  - Multi-user data isolation is enforced via `req.user.id` (`userId` foreign keys).
- **Backend Grocery Scope & API Schema Registry**:
  - Keep this file updated with any grocery-related models, endpoints, and specifications designed for the Android app.
  - *Active Grocery Endpoints & Models Roadmap*:
    - **[IMPLEMENTED]** `GroceryList`, `GroceryItem`, `SavedCatalogItem`, `ShoppingTrip` models added to `prisma/schema.prisma`.
    - **[IMPLEMENTED]** Auth middleware supports both `x-session-token` and standard `Authorization: Bearer <token>`.
    - **[IMPLEMENTED]** REST Endpoints:
      - `GET /api/lists/:shareId` (Fetch active list and catalog)
      - `POST /api/lists/sync` (Atomic sync of lists and catalog)
      - `POST /api/trips`, `GET /api/trips`, `DELETE /api/trips/:id` (Trip history management)
    - *Pending*: AI-assisted grocery item categorization and smart merging from recipe ingredients.
