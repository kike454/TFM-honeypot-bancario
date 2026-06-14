#!/bin/bash
set -e

echo "[+] Entrando en el proyecto..."
cd ~/honeypot-bancario || exit 1

echo "[+] Actualizando código..."
git pull origin master || echo "[X] Falló git pull"

# ============================================================
# BACKEND — FastAPI + Python
# ============================================================
echo "[+] Configurando backend..."
cd backend

echo "[+] Creando entorno virtual si no existe..."
python3 -m venv venv || true
source venv/bin/activate

echo "[+] Instalando dependencias backend..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[+] Creando .env del backend..."
cat > .env << ENVEOF
DATABASE_URL=${DATABASE_URL}
GEOIP_DB_PATH=${GEOIP_DB_PATH}
ABUSEIPDB_API_KEY=${ABUSEIPDB_API_KEY}
VIRUSTOTAL_API_KEY=${VIRUSTOTAL_API_KEY}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
GEO_TIMEOUT=3.0
MAX_BODY_SIZE=1048576
ENVEOF

echo "[+] Reiniciando backend con PM2..."
pm2 restart honeypot-backend 2>/dev/null || \
  pm2 start "venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000" \
  --name honeypot-backend
sleep 2

# ============================================================
# FRONTEND — Next.js
# ============================================================
echo "[+] Configurando frontend..."
cd ../frontend

echo "[+] Creando .env.local del frontend..."
cat > .env.local << ENVEOF
NEXT_PUBLIC_API_URL=https://finconnect.store/api
ENVEOF

echo "[+] Instalando dependencias frontend..."
npm install

echo "[+] Build del frontend..."
npm run build

echo "[+] Reiniciando frontend con PM2..."
pm2 restart honeypot-frontend 2>/dev/null || \
  pm2 start npm --name honeypot-frontend -- start
sleep 2

# ============================================================
# GUARDAR PROCESOS PM2
# ============================================================
pm2 save

echo "[+] Despliegue completo."
echo "[+] Backend:  http://${EC2_IP}:8000"
echo "[+] Frontend: http://${EC2_IP}:3000"
echo "[+] Swagger:  http://${EC2_IP}:8000/docs"
