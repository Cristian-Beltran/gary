# Gary - Sistema de terapia respiratoria

Este repositorio contiene:

- `Gary.ino`: firmware ESP32 (sensores + MQTT)
- `test-pulmonar-gareth-backend`: API NestJS + SQLite
- `test-pulmonar-gareth-frontend`: app React/Vite

## Requisitos

- Node.js 20+
- npm 10+
- Arduino IDE 2.x
- Placa ESP32 (core `esp32 by Espressif Systems`)

## Librerias Arduino necesarias

Instala desde **Library Manager**:

- `PubSubClient` (Nick O'Leary)
- `Adafruit GFX Library` (Adafruit)
- `Adafruit SSD1306` (Adafruit)
- `SparkFun MAX3010x Pulse and Proximity Sensor Library` (SparkFun Electronics)

> `Wire.h`, `math.h` y `WiFi.h` vienen del core ESP32.

## 1) Configurar firmware (`Gary.ino`)

En `Gary.ino` configura:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `MQTT_BROKER` (actualmente `broker.hivemq.com`)
- topics MQTT:
  - `gary/device/telemetry`
  - `gary/device/status`

Compila y sube al ESP32.

## 2) Backend (NestJS)

```bash
cd test-pulmonar-gareth-backend
npm install
npm run build
npm run start
```

Notas:

- Usa SQLite local en `test-pulmonar-gareth-backend/data/local.db`
- Sin `.env` (configuracion directa en código)
- MQTT backend (TCP): `broker.hivemq.com:1883`

Comandos utiles:

```bash
npm run seed:admin
npm run test
```

## 3) Frontend (React + Vite)

```bash
cd test-pulmonar-gareth-frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

MQTT frontend (WebSocket):

- `ws://broker.hivemq.com:8000/mqtt`

## Estructura de roles

- `doctor`: Dashboard clinico, Doctores, Pacientes, Monitoring
- `patient`: Dashboard paciente, Entrenamiento

## Flujo principal

1. Doctor inicia/cierra sesión global en `Monitoring`.
2. ESP publica telemetria por MQTT.
3. Frontend muestra tiempo real.
4. Backend guarda snapshot cada 1 minuto si hay sesión activa.
5. Paciente realiza entrenamientos respiratorios por tiempo.

## Inicializar Git

Desde la raiz del proyecto:

```bash
git init
git add .
git commit -m "chore: initialize repository"
```
