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
supabase functions deploy ai-match icebreaker compatibility dating-coach delete-account create-payment verify-payment moneyfusion-webhook
```

Configurer les secrets Supabase :

```bash
supabase secrets set MONEYFUSION_API_URL="https://pay.moneyfusion.net/Votre_App/votre-cle/pay/"
supabase secrets set APP_URL="https://www.amova.space"
```

Documentation paiement : [FusionPay API Web](https://docs.moneyfusion.net/fr/webapi)

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest |

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
