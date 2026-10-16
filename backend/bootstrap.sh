#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/5] Updating packages and installing prerequisites ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release postgresql-client openjdk-21-jdk maven git

echo "=== [2/5] Installing Docker Engine & Compose ==="
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker ubuntu
fi

echo "=== [3/5] Initializing RDS databases ==="
DB_HOST="${DB_ENDPOINT:-sih-postgres.cv4ygog0qn0f.ap-south-1.rds.amazonaws.com}"
DB_PASS="${DB_PASSWORD:-}"

if [ -z "$DB_PASS" ]; then
    echo "ERROR: DB_PASSWORD environment variable must be provided." >&2
    exit 1
fi

for dbname in sih_source sih_problem sih_eval sih_portal sih_codejudge; do
    echo "Checking/creating database: $dbname"
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U sih -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$dbname'" | grep -q 1 || \
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U sih -d postgres -c "CREATE DATABASE $dbname;"
done

echo "=== Database initialization complete! ==="
