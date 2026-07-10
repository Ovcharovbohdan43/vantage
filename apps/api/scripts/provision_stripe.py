"""Create Stripe test products/prices for ReserchMarket credit packs.

Usage (from apps/api):
  py scripts/provision_stripe.py

Requires STRIPE_SECRET_KEY in .env (full sk_test_... key from Stripe Dashboard).
Prints price IDs to paste into .env as STRIPE_PRICE_*.
"""

from __future__ import annotations

import os
import sys

import stripe

# Allow running without installing the package in editable mode.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings  # noqa: E402

PACKS = [
    ("starter", "Starter Research", 900, 1),
    ("founder", "Founder Pack", 2900, 5),
    ("indie", "Indie Hacker", 7900, 20),
]


def main() -> None:
    secret = settings.stripe_secret_key.strip()
    if not secret or secret.endswith("..."):
        print("Set STRIPE_SECRET_KEY in apps/api/.env (full sk_test_ key from Stripe Dashboard).")
        sys.exit(1)

    stripe.api_key = secret
    print(f"Stripe account: {stripe.Account.retrieve().id}\n")

    for pack_id, name, unit_amount, credits in PACKS:
        product = stripe.Product.create(
            name=name,
            metadata={"pack": pack_id, "credits": str(credits)},
        )
        price = stripe.Price.create(
            product=product.id,
            unit_amount=unit_amount,
            currency="usd",
            metadata={"pack": pack_id, "credits": str(credits)},
        )
        env_key = f"STRIPE_PRICE_{pack_id.upper()}"
        print(f"{env_key}={price.id}  # {name} ${unit_amount // 100} -> {credits} credit(s)")


if __name__ == "__main__":
    main()
