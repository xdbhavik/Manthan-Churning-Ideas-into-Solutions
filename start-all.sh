#!/bin/bash

echo "===================================================="
echo "Starting Backend and Frontend Docker Containers..."
echo "===================================================="

# Navigate to the directory where this script is located
cd "$(dirname "$0")" || exit

echo "[1/3] Packaging backend services..."
echo "This may take a few minutes. Docker containers will start only after Maven reports BUILD SUCCESS."
cd backend || { echo "[ERROR] Backend directory not found."; exit 1; }
if [ -f ./mvnw ]; then
    bash ./mvnw -Dmaven.test.skip=true package
elif command -v mvn >/dev/null 2>&1; then
    mvn -Dmaven.test.skip=true package
else
    echo "[ERROR] Maven was not found. Install Maven or restore backend/mvnw."
    exit 1
fi
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to package backend services."
    exit 1
fi

echo "[2/3] Starting backend containers..."
docker compose up -d --build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start backend containers."
    exit 1
fi
echo ""
echo "Backend container status:"
docker compose ps
cd ..

echo ""
echo "[3/3] Starting frontend containers..."
docker compose -f docker-compose.yml up -d --build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start frontend containers."
    exit 1
fi
echo ""
echo "Frontend container status:"
docker compose ps

echo ""
echo "===================================================="
echo "All containers started successfully in the background!"
echo "===================================================="
