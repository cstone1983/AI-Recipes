# GEMINI.md

# Stones Recipes (AI-Recipes) & Grocery Companion API

## Architecture & Integration Context
This project serves as:
1. The **Web Application** for Recipe Management, AI importing, nutrition analysis, and cookbook generation.
2. The **Central Backend & Database Host** for a separate companion **Android Grocery Shopping App**.

## Database & API Design Principles for Grocery Companion
- **Schema Management**: All database modifications are defined in `prisma/schema.prisma` and deployed to self-hosted instances using the OTA update mechanism (`update.sh` / `npx prisma db push`).
- **REST APIs for Mobile**: Expose clean REST JSON endpoints under `/api/groceries/*` or `/api/shopping-lists/*`.
- **Security & Authorization**: Require token authentication (`x-session-token`) so each mobile user's lists and groceries are scoped to their account (`req.user.id`).
- **Cross-Service Capabilities**: Allow direct conversion of recipe ingredients (`Recipe` -> `Ingredient`) into shopping list items (`ShoppingList` -> `GroceryItem`).
