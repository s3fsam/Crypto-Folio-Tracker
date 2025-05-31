#!/bin/bash

# === CONFIGURATION ===
REPO_DIR="/ton/chemin/vers/ton/repertoire/local"
BRANCH="main"
GIT_USER="TonNom"
GIT_EMAIL="ton.email@example.com"

# === SCRIPT ===
cd "$REPO_DIR" || exit 1

# Config Git (une seule fois normalement)
git config user.name "$GIT_USER"
git config user.email "$GIT_EMAIL"

# Status
git status

# Ajout des fichiers modifiés
git add .

# Commit avec timestamp
git commit -m "Mise à jour automatique $(date '+%Y-%m-%d %H:%M:%S')"

# Pull avant push pour éviter les conflits
git pull origin $BRANCH

# Push vers le dépôt distant
git push origin $BRANCH

echo "✅ Mise à jour effectuée et poussée sur GitHub."
