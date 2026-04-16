#!/usr/bin/env bash
# ============================================================
# Velona — Création automatique des prix Stripe
# Usage: bash stripe-setup-prices.sh
# Nécessite: curl, python3
# ============================================================

set -e

ENV_FILE="$(dirname "$0")/backend/.env"

# Lire la clé secrète depuis backend/.env
SK=$(grep '^STRIPE_SECRET_KEY=' "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$SK" || "$SK" == "sk_test_..." ]]; then
  echo "❌ STRIPE_SECRET_KEY introuvable dans $ENV_FILE"
  echo "   Renseignez-la d'abord, puis relancez ce script."
  exit 1
fi

extract_id() {
  python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'id' in d:
    print(d['id'])
else:
    print('ERREUR: ' + d.get('error', {}).get('message', str(d)), file=sys.stderr)
    sys.exit(1)
"
}

create_product() {
  local name="$1"
  curl -s https://api.stripe.com/v1/products \
    -u "$SK:" \
    --data-urlencode "name=$name" | extract_id
}

create_price() {
  local product="$1"
  local amount="$2"   # en centimes
  local interval="$3" # month | year
  curl -s https://api.stripe.com/v1/prices \
    -u "$SK:" \
    -d "product=$product" \
    -d "unit_amount=$amount" \
    -d "currency=eur" \
    -d "recurring[interval]=$interval" | extract_id
}

update_env() {
  local key="$1"
  local value="$2"
  # macOS: sed -i ''   |  Linux: sed -i
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  fi
}

echo "🚀 Velona — Création des produits & prix Stripe (test mode)"
echo "📄 Fichier cible : $ENV_FILE"
echo ""

# ── Produits ──────────────────────────────────────────────
echo "📦 Création des produits..."
PROD_SI=$(create_product "Velona Starter Individuel")  && echo "  ✓ Starter Individuel  → $PROD_SI"
PROD_SP=$(create_product "Velona Starter Professionnel") && echo "  ✓ Starter Professionnel → $PROD_SP"
PROD_PI=$(create_product "Velona Pro Individuel")      && echo "  ✓ Pro Individuel       → $PROD_PI"
PROD_PP=$(create_product "Velona Pro Professionnel")   && echo "  ✓ Pro Professionnel    → $PROD_PP"
PROD_E=$(create_product  "Velona Enterprise")          && echo "  ✓ Enterprise           → $PROD_E"

# ── Prix mensuels ─────────────────────────────────────────
echo ""
echo "💶 Création des prix mensuels..."
# Starter Individuel   29€  = 2900 cents
P_SI_M=$(create_price "$PROD_SI" 2900  month) && echo "  ✓ Starter Ind.  mensuel   → $P_SI_M"
# Starter Pro          49€  = 4900 cents
P_SP_M=$(create_price "$PROD_SP" 4900  month) && echo "  ✓ Starter Pro   mensuel   → $P_SP_M"
# Pro Individuel       79€  = 7900 cents
P_PI_M=$(create_price "$PROD_PI" 7900  month) && echo "  ✓ Pro Ind.      mensuel   → $P_PI_M"
# Pro Pro             129€  = 12900 cents
P_PP_M=$(create_price "$PROD_PP" 12900 month) && echo "  ✓ Pro Pro       mensuel   → $P_PP_M"
# Enterprise          299€  = 29900 cents
P_E_M=$(create_price  "$PROD_E"  29900 month) && echo "  ✓ Enterprise    mensuel   → $P_E_M"

# ── Prix annuels (-20%, facturés à l'année) ───────────────
echo ""
echo "📅 Création des prix annuels (-20%)..."
# 29 × 12 × 0,8  = 278,40€ = 27840 cents
P_SI_A=$(create_price "$PROD_SI" 27840  year) && echo "  ✓ Starter Ind.  annuel    → $P_SI_A"
# 49 × 12 × 0,8  = 470,40€ = 47040 cents
P_SP_A=$(create_price "$PROD_SP" 47040  year) && echo "  ✓ Starter Pro   annuel    → $P_SP_A"
# 79 × 12 × 0,8  = 758,40€ = 75840 cents
P_PI_A=$(create_price "$PROD_PI" 75840  year) && echo "  ✓ Pro Ind.      annuel    → $P_PI_A"
# 129 × 12 × 0,8 = 1238,40€ = 123840 cents
P_PP_A=$(create_price "$PROD_PP" 123840 year) && echo "  ✓ Pro Pro       annuel    → $P_PP_A"
# 299 × 12 × 0,8 = 2870,40€ = 287040 cents
P_E_A=$(create_price  "$PROD_E"  287040 year) && echo "  ✓ Enterprise    annuel    → $P_E_A"

# ── Écriture dans backend/.env ────────────────────────────
echo ""
echo "✏️  Mise à jour de $ENV_FILE..."
update_env "STRIPE_STARTER_INDIVIDUAL_MONTHLY_PRICE_ID"    "$P_SI_M"
update_env "STRIPE_STARTER_INDIVIDUAL_ANNUAL_PRICE_ID"     "$P_SI_A"
update_env "STRIPE_STARTER_PROFESSIONAL_MONTHLY_PRICE_ID"  "$P_SP_M"
update_env "STRIPE_STARTER_PROFESSIONAL_ANNUAL_PRICE_ID"   "$P_SP_A"
update_env "STRIPE_PRO_INDIVIDUAL_MONTHLY_PRICE_ID"        "$P_PI_M"
update_env "STRIPE_PRO_INDIVIDUAL_ANNUAL_PRICE_ID"         "$P_PI_A"
update_env "STRIPE_PRO_PROFESSIONAL_MONTHLY_PRICE_ID"      "$P_PP_M"
update_env "STRIPE_PRO_PROFESSIONAL_ANNUAL_PRICE_ID"       "$P_PP_A"
update_env "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID"            "$P_E_M"
update_env "STRIPE_ENTERPRISE_ANNUAL_PRICE_ID"             "$P_E_A"

echo ""
echo "✅ Terminé ! Tous les prix ont été créés et écrits dans backend/.env"
echo ""
echo "Récapitulatif des Price IDs :"
echo "  STRIPE_STARTER_INDIVIDUAL_MONTHLY_PRICE_ID=$P_SI_M"
echo "  STRIPE_STARTER_INDIVIDUAL_ANNUAL_PRICE_ID=$P_SI_A"
echo "  STRIPE_STARTER_PROFESSIONAL_MONTHLY_PRICE_ID=$P_SP_M"
echo "  STRIPE_STARTER_PROFESSIONAL_ANNUAL_PRICE_ID=$P_SP_A"
echo "  STRIPE_PRO_INDIVIDUAL_MONTHLY_PRICE_ID=$P_PI_M"
echo "  STRIPE_PRO_INDIVIDUAL_ANNUAL_PRICE_ID=$P_PI_A"
echo "  STRIPE_PRO_PROFESSIONAL_MONTHLY_PRICE_ID=$P_PP_M"
echo "  STRIPE_PRO_PROFESSIONAL_ANNUAL_PRICE_ID=$P_PP_A"
echo "  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=$P_E_M"
echo "  STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=$P_E_A"
