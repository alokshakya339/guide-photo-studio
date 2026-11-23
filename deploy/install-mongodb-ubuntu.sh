#!/usr/bin/env bash
# Installs MongoDB Community 8.0 as a normal service on Ubuntu 24.04 (noble) for local development.
# Data lives in /var/lib/mongodb and survives restarts. Also installs mongodump / mongorestore.
# Run once:  bash deploy/install-mongodb-ubuntu.sh   (asks for your computer password)
set -euo pipefail

. /etc/os-release
if [ "${VERSION_CODENAME:-}" != "noble" ]; then
  echo "This script is for Ubuntu 24.04 (noble); this system is ${PRETTY_NAME:-unknown}." >&2
  exit 1
fi

echo "• Adding MongoDB's signing key and package source…"
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --yes -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null

echo "• Installing MongoDB…"
sudo apt-get update -qq
sudo apt-get install -y mongodb-org

echo "• Starting MongoDB now and on every boot…"
sudo systemctl enable --now mongod

for i in $(seq 1 20); do mongosh --quiet --eval 'db.version()' >/dev/null 2>&1 && break; sleep 1; done
echo "✅ MongoDB $(mongosh --quiet --eval 'db.version()') is running on mongodb://127.0.0.1:27017"
