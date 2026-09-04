# Amova

Application de rencontres confidentielles (React + Supabase).

## Prérequis

- Node.js 18+
- Compte [Supabase](https://supabase.com)

## Installation

```bash
npm install
cp .env.example .env
```

Renseignez les variables dans `.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-cle-anon
VITE_SUPABASE_PROJECT_ID=votre-project-id
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Supabase

Appliquer les migrations :

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Déployer les Edge Functions :

```bash
supabase functions deploy ai-match icebreaker compatibility dating-coach delete-account create-payment verify-payment moneyfusion-webhook platform-cron sumsub-token sumsub-webhook verify-identity
```

Configurer les secrets Supabase :

```bash
supabase secrets set MONEYFUSION_API_URL="https://pay.moneyfusion.net/Votre_App/votre-cle/pay/"
supabase secrets set MONEYFUSION_WEBHOOK_SECRET="secret-partage"
supabase secrets set APP_URL="https://www.amova.space"
supabase secrets set CRON_SECRET="secret-aleatoire"
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:contact@amova.space"
# optionnel Android :
# supabase secrets set FCM_SERVER_KEY="..."
```

### Push / cron (ops)

1. Générer les clés VAPID (`npx web-push generate-vapid-keys`) et les poser côté client (`VITE_VAPID_PUBLIC_KEY`) + secrets edge.
2. Planifier un job horaire :

```bash
curl -X POST "$SUPABASE_URL/functions/v1/platform-cron" -H "X-Cron-Secret: $CRON_SECRET"
```

3. Vérifier la config :

```bash
npm run ops:check-push
# ou
curl "$SUPABASE_URL/functions/v1/platform-cron?health=1" -H "X-Cron-Secret: $CRON_SECRET"
```

Documentation paiement : [FusionPay API Web](https://docs.moneyfusion.net/fr/webapi)

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest |
| `npm run test:e2e` | Playwright (smoke + auth si creds) |
| `npm run ops:check-push` | Probe health platform-cron / VAPID |
| `npm run db:migrate` | Appliquer migrations via Management API |

### E2E

```bash
# Smoke public (landing, auth, légal)
npm run test:e2e

# Flows authentifiés (swipe, messages, premium, admin)
$env:PLAYWRIGHT_BASE_URL="https://www.amova.space"
$env:PLAYWRIGHT_TEST_EMAIL="compte-test@example.com"
$env:PLAYWRIGHT_TEST_PASSWORD="..."
npm run test:e2e -- --project=authenticated
```

## Structure

- `src/pages/` — pages de l'application
- `src/components/` — composants UI
- `src/hooks/` — logique réutilisable
- `supabase/migrations/` — schéma PostgreSQL et RLS
- `supabase/functions/` — Edge Functions (IA, suppression de compte)

## Sécurité

- Ne commitez jamais `.env`
- Les abonnements sont gérés côté serveur (RPC admin uniquement)
- Les fonctions IA exigent un JWT utilisateur valide
