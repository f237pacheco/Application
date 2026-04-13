# Velona — Application SaaS IA multi-services

Application SaaS permettant aux entreprises et particuliers d'accéder à des services IA via un abonnement mensuel.

## Architecture

```
velona/
├── web/          Next.js 14 (App Router) + TailwindCSS
├── mobile/       React Native + Expo + NativeWind
├── backend/      Node.js + Express (API REST)
└── supabase/     Migrations SQL + config
```

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile | React Native, Expo, Expo Router, NativeWind |
| Web | Next.js 14 (App Router), TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth, Google OAuth |
| Paiements | Stripe + PayPal |
| i18n | i18next (9 langues) |

## Prérequis

- Node.js 20+
- npm 10+
- Compte Supabase
- Compte Stripe
- Compte Google Cloud (OAuth)
- Expo CLI (`npm install -g expo-cli`)

## Installation

### 1. Cloner le projet

```bash
git clone <repo-url>
cd velona
npm install
```

### 2. Variables d'environnement

```bash
# Web
cp web/.env.local.example web/.env.local

# Mobile
cp mobile/.env.example mobile/.env

# Backend
cp backend/.env.example backend/.env
```

Remplissez chaque fichier avec vos clés.

### 3. Base de données Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans l'éditeur SQL et exécutez :
   ```sql
   -- Contenu de supabase/migrations/001_initial_schema.sql
   ```
3. Configurez Google OAuth dans **Authentication > Providers > Google**
4. Ajoutez les redirect URLs :
   - `http://localhost:3000/auth/callback` (web dev)
   - `velona://auth/callback` (mobile)

### 4. Google OAuth

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un projet > Identifiants > ID client OAuth 2.0
3. Type : Application Web
4. Origines autorisées : `http://localhost:3000`
5. URIs de redirection : URL fournie par Supabase
6. Copiez Client ID et Client Secret dans Supabase > Auth > Google

### 5. Stripe

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Créez les produits et prix correspondant aux plans Velona
3. Copiez les Price IDs dans `backend/.env`
4. Pour les webhooks en développement :
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

## Lancer en développement

```bash
# Web (http://localhost:3000)
npm run web

# Backend (http://localhost:3001)
npm run backend

# Mobile (scan QR avec Expo Go)
npm run mobile
```

## Phases de développement

| Phase | Description | Statut |
|---|---|---|
| Phase 1 | Setup + navigation + i18n + Supabase auth | ✅ Complète |
| Phase 2 | Écrans 1-3 (langue, onboarding, compte) | En cours |
| Phase 3 | Écrans 4-6 (accueil, services, plans) | Prévu |
| Phase 4 | Paiement Stripe + PayPal | Prévu |
| Phase 5 | Dashboard + limites d'usage | Prévu |
| Phase 6 | Programme partenaire | Prévu |

## Langues supportées

🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español · 🇩🇪 Deutsch · 🇮🇹 Italiano · 🇵🇹 Português · 🇸🇦 العربية · 🇯🇵 日本語 · 🇨🇳 中文

## Plans tarifaires

| Plan | Particulier | Professionnel |
|---|---|---|
| Starter | 29€/mois | 49€/mois |
| Pro | 79€/mois | 129€/mois |
| Enterprise | 299€/mois | 299€/mois |

Tous les plans incluent un essai gratuit de 3 jours.

## Variables d'environnement requises

### web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
```

### mobile/.env
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
```

### backend/.env
```
PORT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_*_PRICE_ID  (10 price IDs)
```
