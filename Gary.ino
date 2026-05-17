#include <Wire.h>
#include <math.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// ESP32 NodeMCU 40 pines
constexpr uint8_t I2C_SDA_PIN = 32;
constexpr uint8_t I2C_SCL_PIN = 33;
constexpr uint8_t VIBRATOR_PIN = 26;
constexpr uint8_t RELAY_RED_PIN = 25;
constexpr uint8_t RELAY_GREEN_PIN = 27;
constexpr uint8_t LUNG_PRESSURE_PIN = 35;  // ADC solo entrada

// OLED 0.91" I2C
constexpr uint8_t OLED_ADDRESS = 0x3C;  // 0x78 en 8 bits equivale a 0x3C en 7 bits
constexpr uint8_t OLED_WIDTH = 128;
constexpr uint8_t OLED_HEIGHT = 32;

// Tiempo entre impresiones
constexpr unsigned long SERIAL_INTERVAL_MS = 500;
constexpr unsigned long MQTT_TELEMETRY_INTERVAL_MS = 500;
constexpr unsigned long MQTT_STATUS_INTERVAL_MS = 5000;
constexpr unsigned long OLED_INTERVAL_MS = 150;
constexpr unsigned long RESULT_BLINK_MS = 180;
constexpr unsigned long RESULT_SIGNAL_TIME_MS = 5000;

// Parametros del MAX30102
constexpr uint16_t MAX30102_BRIGHTNESS = 60;
constexpr uint8_t MAX30102_SAMPLE_AVERAGE = 4;
constexpr uint8_t MAX30102_LED_MODE = 2;         // Rojo + IR
constexpr uint16_t MAX30102_SAMPLE_RATE = 100;   // Hz
constexpr uint16_t MAX30102_PULSE_WIDTH = 411;
constexpr uint16_t MAX30102_ADC_RANGE = 4096;
constexpr float MIN_VALID_HEART_RATE_BPM = 45.0f;
constexpr float MAX_VALID_HEART_RATE_BPM = 160.0f;
constexpr int32_t MIN_VALID_SPO2 = 80;
constexpr int32_t MAX_VALID_SPO2 = 100;
constexpr uint32_t MIN_FINGER_IR = 50000;
constexpr uint32_t MAX_FINGER_IR = 150000;
constexpr float HEART_RATE_SMOOTHING = 0.25f;
constexpr float MAX_HEART_RATE_STEP_BPM = 15.0f;
constexpr int32_t MAX_SPO2_STEP = 3;
constexpr float SPO2_SMOOTHING = 0.30f;

// Buffer para calcular pulso y SpO2
constexpr int32_t MAX30102_BUFFER_SIZE = 100;
uint32_t irBuffer[MAX30102_BUFFER_SIZE];
uint32_t redBuffer[MAX30102_BUFFER_SIZE];

// Parametros del MPXV7002DP
constexpr float ADC_REFERENCE_V = 3.3f;
constexpr uint16_t ADC_RESOLUTION = 4095;
constexpr float SENSOR_OUTPUT_DIVIDER = 2.0f;
constexpr float MPXV7002_SENSITIVITY_V_PER_KPA = 1.0f;
constexpr float MPXV7002_ZERO_PRESSURE_V = 2.5f;
constexpr float PRESSURE_OFFSET_KPA = 0.0f;
constexpr float SAMPLE_START_PRESSURE_KPA = 0.35f;
constexpr float SAMPLE_END_PRESSURE_KPA = 0.18f;
constexpr float PRESSURE_BASELINE_SMOOTHING = 0.08f;

// WiFi + MQTT (configuracion local)
const char* WIFI_SSID = "Cordova hogar ext";
const char* WIFI_PASSWORD = "4ndiNicol3";
const char* MQTT_BROKER = "broker.hivemq.com";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_TOPIC_TELEMETRY = "gary/device/telemetry";
const char* MQTT_TOPIC_STATUS = "gary/device/status";

enum BreathingState : uint8_t {
  STATE_WAIT_FINGER = 0,
  STATE_READY_TO_TEST,
  STATE_SAMPLING,
  STATE_RESULT
};

MAX30105 particleSensor;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

float heartRateBpm = 0.0f;
int32_t spo2 = 0;
float spo2Filtered = 0.0f;
bool validHeartRate = false;
bool validSpO2 = false;
float lungPressureRawKpa = 0.0f;
float lungPressureKpa = 0.0f;
float lungPressureBaselineKpa = 0.0f;
bool pressureBaselineReady = false;
uint32_t lastIrValue = 0;
bool fingerDetected = false;
bool max30102Available = false;
bool displayAvailable = false;
int32_t max30102SamplesStored = 0;
int32_t max30102NewSamples = 0;

BreathingState breathingState = STATE_WAIT_FINGER;
float samplePeakPressureKpa = 0.0f;
float sampleAveragePressureKpa = 0.0f;
float lastSamplePeakPressureKpa = 0.0f;
float lastSampleAveragePressureKpa = 0.0f;
unsigned long sampleStartMs = 0;
unsigned long sampleLastActiveMs = 0;
unsigned long sampleDurationMs = 0;
unsigned long lastSampleDurationMs = 0;
unsigned long resultStartMs = 0;
uint32_t samplePoints = 0;

unsigned long lastSerialPrintMs = 0;
unsigned long lastDisplayUpdateMs = 0;
unsigned long lastMqttTelemetryMs = 0;
unsigned long lastMqttStatusMs = 0;

void initializeMax30102();
void initializePressureSensor();
void initializeDisplay();
void updatePressure();
void updateMax30102();
void updateBreathingTest();
void updateOutputs();
void updateDisplay();
void printTelemetry();
float readPressureKpa();
const char* getPressureRangeLabel(float pressureKpa);
const char* getSpo2StatusLabel();
const char* getStateLabel();
const char* getSampleQualityLabel(float pressureKpa);
void startSample();
void finishSample();
void connectWifi();
void ensureMqttConnection();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishTelemetry();
void publishDeviceStatus();

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(RELAY_RED_PIN, OUTPUT);
  pinMode(RELAY_GREEN_PIN, OUTPUT);
  digitalWrite(VIBRATOR_PIN, LOW);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  initializePressureSensor();
  initializeDisplay();
  initializeMax30102();

  connectWifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("Sistema Gary iniciado");
}

void loop() {
  updatePressure();
  updateMax30102();
  updateBreathingTest();
  updateOutputs();

  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  ensureMqttConnection();
  mqttClient.loop();

  if (millis() - lastDisplayUpdateMs >= OLED_INTERVAL_MS) {
    lastDisplayUpdateMs = millis();
    updateDisplay();
  }

  if (millis() - lastSerialPrintMs >= SERIAL_INTERVAL_MS) {
    lastSerialPrintMs = millis();
    printTelemetry();
  }

  if (millis() - lastMqttTelemetryMs >= MQTT_TELEMETRY_INTERVAL_MS) {
    lastMqttTelemetryMs = millis();
    publishTelemetry();
  }

  if (millis() - lastMqttStatusMs >= MQTT_STATUS_INTERVAL_MS) {
    lastMqttStatusMs = millis();
    publishDeviceStatus();
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 10000) {
    delay(250);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi conectado: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("No se pudo conectar a WiFi");
  }
}

void ensureMqttConnection() {
  if (mqttClient.connected() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  String clientId = "gary-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  String willPayload = "{\"online\":false,\"mqttConnected\":false,\"wifiConnected\":false}";

  if (mqttClient.connect(clientId.c_str(), MQTT_TOPIC_STATUS, 1, true, willPayload.c_str())) {
    publishDeviceStatus();
    Serial.println("MQTT conectado");
  } else {
    Serial.print("MQTT fallo rc=");
    Serial.println(mqttClient.state());
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  (void)topic;
  (void)payload;
  (void)length;
}

void publishTelemetry() {
  if (!mqttClient.connected()) {
    return;
  }

  int pulseOut = validHeartRate && heartRateBpm > 0.0f
                   ? static_cast<int>(heartRateBpm + 0.5f)
                   : 0;
  int spo2Out = validSpO2 && spo2Filtered > 0.0f
                  ? static_cast<int>(spo2Filtered + 0.5f)
                  : 0;

  String payload = "{";
  payload += "\"pulse\":" + String(pulseOut) + ",";
  payload += "\"oxygenSaturation\":" + String(spo2Out) + ",";
  payload += "\"lungCapacity\":" + String(lungPressureKpa, 3) + ",";
  payload += "\"state\":\"" + String(getStateLabel()) + "\",";
  payload += "\"timestamp\":" + String(millis()) + ",";
  payload += "\"mqttConnected\":" + String(mqttClient.connected() ? "true" : "false");
  payload += "}";

  mqttClient.publish(MQTT_TOPIC_TELEMETRY, payload.c_str(), false);
}

void publishDeviceStatus() {
  if (!mqttClient.connected()) {
    return;
  }

  String ip = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "0.0.0.0";

  String payload = "{";
  payload += "\"online\":true,";
  payload += "\"mqttConnected\":" + String(mqttClient.connected() ? "true" : "false") + ",";
  payload += "\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  payload += "\"ip\":\"" + ip + "\",";
  payload += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"timestamp\":" + String(millis());
  payload += "}";

  mqttClient.publish(MQTT_TOPIC_STATUS, payload.c_str(), true);
}

void initializePressureSensor() {
  analogReadResolution(12);
  analogSetPinAttenuation(LUNG_PRESSURE_PIN, ADC_11db);
}

void initializeDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("No se detecto la OLED.");
    return;
  }

  displayAvailable = true;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Iniciando...");
  display.display();
}

void initializeMax30102() {
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("No se detecto el MAX30102. Verifica cableado y alimentacion.");
    max30102Available = false;
    return;
  }

  particleSensor.setup(
    MAX30102_BRIGHTNESS,
    MAX30102_SAMPLE_AVERAGE,
    MAX30102_LED_MODE,
    MAX30102_SAMPLE_RATE,
    MAX30102_PULSE_WIDTH,
    MAX30102_ADC_RANGE
  );

  particleSensor.setPulseAmplitudeRed(0x1F);
  particleSensor.setPulseAmplitudeIR(0x1F);
  particleSensor.setPulseAmplitudeGreen(0);

  max30102Available = true;
  Serial.println("MAX30102 inicializado correctamente.");
}

void updatePressure() {
  lungPressureRawKpa = readPressureKpa();

  if (!pressureBaselineReady) {
    lungPressureBaselineKpa = lungPressureRawKpa;
    pressureBaselineReady = true;
  }

  if (breathingState != STATE_SAMPLING) {
    lungPressureBaselineKpa =
      lungPressureBaselineKpa +
      ((lungPressureRawKpa - lungPressureBaselineKpa) * PRESSURE_BASELINE_SMOOTHING);
  }

  lungPressureKpa = lungPressureRawKpa - lungPressureBaselineKpa;
  if (lungPressureKpa < 0.0f) {
    lungPressureKpa = 0.0f;
  }
}

void updateMax30102() {
  if (!max30102Available) {
    fingerDetected = false;
    validHeartRate = false;
    validSpO2 = false;
    return;
  }

  particleSensor.check();

  while (particleSensor.available()) {
    uint32_t redValue = particleSensor.getRed();
    uint32_t irValue = particleSensor.getIR();
    lastIrValue = irValue;

    if (max30102SamplesStored < MAX30102_BUFFER_SIZE) {
      redBuffer[max30102SamplesStored] = redValue;
      irBuffer[max30102SamplesStored] = irValue;
      max30102SamplesStored++;
    } else {
      for (int32_t i = 0; i < MAX30102_BUFFER_SIZE - 1; i++) {
        redBuffer[i] = redBuffer[i + 1];
        irBuffer[i] = irBuffer[i + 1];
      }
      redBuffer[MAX30102_BUFFER_SIZE - 1] = redValue;
      irBuffer[MAX30102_BUFFER_SIZE - 1] = irValue;
    }

    max30102NewSamples++;
    particleSensor.nextSample();
  }

  if (max30102SamplesStored < MAX30102_BUFFER_SIZE || max30102NewSamples < 25) {
    return;
  }

  int8_t spo2Valid = 0;
  int8_t heartRateFromAlgoValid = 0;
  int32_t heartRateFromAlgo = 0;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    MAX30102_BUFFER_SIZE,
    redBuffer,
    &spo2,
    &spo2Valid,
    &heartRateFromAlgo,
    &heartRateFromAlgoValid
  );

  uint64_t irAccumulator = 0;
  for (int32_t i = 0; i < MAX30102_BUFFER_SIZE; i++) {
    irAccumulator += irBuffer[i];
  }

  uint32_t averageIr = irAccumulator / MAX30102_BUFFER_SIZE;
  fingerDetected = averageIr >= MIN_FINGER_IR && averageIr <= MAX_FINGER_IR;

  if (fingerDetected &&
      heartRateFromAlgoValid == 1 &&
      heartRateFromAlgo >= MIN_VALID_HEART_RATE_BPM &&
      heartRateFromAlgo <= MAX_VALID_HEART_RATE_BPM) {
    float newHeartRate = static_cast<float>(heartRateFromAlgo);

    if (!validHeartRate) {
      heartRateBpm = newHeartRate;
      validHeartRate = true;
    } else if (fabs(newHeartRate - heartRateBpm) <= MAX_HEART_RATE_STEP_BPM) {
      heartRateBpm =
        heartRateBpm + ((newHeartRate - heartRateBpm) * HEART_RATE_SMOOTHING);
    }
  } else if (!fingerDetected) {
    validHeartRate = false;
  }

  if (fingerDetected &&
      spo2Valid == 1 &&
      spo2 >= MIN_VALID_SPO2 &&
      spo2 <= MAX_VALID_SPO2) {
    if (!validSpO2) {
      spo2Filtered = static_cast<float>(spo2);
      validSpO2 = true;
    } else if (abs(spo2 - static_cast<int32_t>(spo2Filtered)) <= MAX_SPO2_STEP) {
      spo2Filtered =
        spo2Filtered + ((static_cast<float>(spo2) - spo2Filtered) * SPO2_SMOOTHING);
    }
  } else if (!fingerDetected) {
    validSpO2 = false;
  }

  max30102NewSamples = 0;
}

void updateBreathingTest() {
  if (!fingerDetected) {
    breathingState = STATE_WAIT_FINGER;
    samplePeakPressureKpa = 0.0f;
    sampleAveragePressureKpa = 0.0f;
    sampleDurationMs = 0;
    samplePoints = 0;
    pressureBaselineReady = false;
    return;
  }

  if (breathingState == STATE_WAIT_FINGER) {
    breathingState = STATE_READY_TO_TEST;
  }

  if (breathingState == STATE_READY_TO_TEST && lungPressureKpa >= SAMPLE_START_PRESSURE_KPA) {
    startSample();
  }

  if (breathingState == STATE_SAMPLING) {
    if (lungPressureKpa > samplePeakPressureKpa) {
      samplePeakPressureKpa = lungPressureKpa;
    }

    sampleAveragePressureKpa += lungPressureKpa;
    samplePoints++;
    sampleDurationMs = millis() - sampleStartMs;

    if (lungPressureKpa >= SAMPLE_START_PRESSURE_KPA) {
      sampleLastActiveMs = millis();
    }

    if (lungPressureKpa <= SAMPLE_END_PRESSURE_KPA &&
        millis() - sampleLastActiveMs >= 300) {
      finishSample();
    }
  }

  if (breathingState == STATE_RESULT &&
      millis() - resultStartMs >= RESULT_SIGNAL_TIME_MS) {
    breathingState = STATE_READY_TO_TEST;
  }
}

void updateOutputs() {
  bool redOn = false;
  bool greenOn = false;
  bool vibratorOn = false;

  switch (breathingState) {
    case STATE_WAIT_FINGER:
      redOn = true;
      break;

    case STATE_READY_TO_TEST:
    case STATE_SAMPLING:
      greenOn = true;
      break;

    case STATE_RESULT: {
      bool blinkOn = ((millis() / RESULT_BLINK_MS) % 2) == 0;
      redOn = blinkOn;
      greenOn = blinkOn;
      vibratorOn = blinkOn;
      break;
    }
  }

  digitalWrite(RELAY_RED_PIN, redOn ? HIGH : LOW);
  digitalWrite(RELAY_GREEN_PIN, greenOn ? HIGH : LOW);
  digitalWrite(VIBRATOR_PIN, vibratorOn ? HIGH : LOW);
}

void updateDisplay() {
  if (!displayAvailable) {
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);

  if (breathingState == STATE_WAIT_FINGER) {
    display.println("Ponga dedo");
    display.println("para iniciar");
    display.print("Pulso: ");
    display.println("--");
    display.print("SpO2 : ");
    display.println("--");
  } else if (breathingState == STATE_READY_TO_TEST) {
    display.print("Pulso: ");
    if (validHeartRate && heartRateBpm > 0.0f) {
      display.print(heartRateBpm, 0);
      display.println(" bpm");
    } else {
      display.println("--");
    }
    display.print("SpO2 : ");
    if (validSpO2 && spo2 > 0) {
      display.print(static_cast<int32_t>(spo2Filtered + 0.5f));
      display.print("% ");
      display.println(getSpo2StatusLabel());
    } else {
      display.println("--");
    }
    display.print("Listo ");
    display.println("respirar");
    display.print("Pres: ");
    display.print(lungPressureKpa, 2);
    display.println(" kPa");
  } else if (breathingState == STATE_SAMPLING) {
    display.print("Pulso: ");
    if (validHeartRate && heartRateBpm > 0.0f) {
      display.print(heartRateBpm, 0);
      display.println(" bpm");
    } else {
      display.println("--");
    }
    display.print("SpO2 : ");
    if (validSpO2 && spo2 > 0) {
      display.print(static_cast<int32_t>(spo2Filtered + 0.5f));
      display.print("% ");
      display.println(getSpo2StatusLabel());
    } else {
      display.println("--");
    }
    display.print("Pico : ");
    display.print(samplePeakPressureKpa, 2);
    display.println("kPa");
    display.print("Tpo  : ");
    display.print(sampleDurationMs / 1000.0f, 1);
    display.println("s");
  } else {
    display.print("Pulso: ");
    if (validHeartRate && heartRateBpm > 0.0f) {
      display.print(heartRateBpm, 0);
      display.println(" bpm");
    } else {
      display.println("--");
    }
    display.print("SpO2 : ");
    if (validSpO2 && spo2 > 0) {
      display.print(static_cast<int32_t>(spo2Filtered + 0.5f));
      display.print("% ");
      display.println(getSpo2StatusLabel());
    } else {
      display.println("--");
    }
    display.print("Resultado: ");
    display.println(getSampleQualityLabel(lastSamplePeakPressureKpa));
    display.print("Fuerza: ");
    display.println(getPressureRangeLabel(lastSamplePeakPressureKpa));
    display.print("Pico:");
    display.print(lastSamplePeakPressureKpa, 2);
    display.print("k");
  }

  display.display();
}

void printTelemetry() {
  Serial.print("Estado: ");
  Serial.println(getStateLabel());

  Serial.print("Pulso: ");
  if (validHeartRate && heartRateBpm > 0.0f) {
    Serial.print(heartRateBpm, 1);
    Serial.println(" bpm");
  } else {
    Serial.println("Sin lectura");
  }

  Serial.print("SpO2: ");
  if (validSpO2 && spo2 > 0) {
    Serial.print(static_cast<int32_t>(spo2Filtered + 0.5f));
    Serial.print(" % (");
    Serial.print(getSpo2StatusLabel());
    Serial.println(")");
  } else {
    Serial.println("Sin lectura");
  }

  Serial.print("Respiracion actual: ");
  Serial.print(lungPressureKpa, 2);
  Serial.print(" kPa | Rango: ");
  Serial.println(getPressureRangeLabel(lungPressureKpa));

  Serial.print("Base respiracion: ");
  Serial.print(lungPressureBaselineKpa, 2);
  Serial.println(" kPa");

  if (breathingState == STATE_RESULT) {
    Serial.print("Muestra final -> Resultado: ");
    Serial.print(getSampleQualityLabel(lastSamplePeakPressureKpa));
    Serial.print(" | Fuerza: ");
    Serial.print(getPressureRangeLabel(lastSamplePeakPressureKpa));
    Serial.print(" | Pico: ");
    Serial.print(lastSamplePeakPressureKpa, 2);
    Serial.print(" kPa | Tiempo: ");
    Serial.print(lastSampleDurationMs / 1000.0f, 1);
    Serial.println(" s");
  }

  Serial.println();
}

float readPressureKpa() {
  uint16_t rawAdc = analogRead(LUNG_PRESSURE_PIN);
  float adcVoltage = (static_cast<float>(rawAdc) / ADC_RESOLUTION) * ADC_REFERENCE_V;
  float sensorVoltage = adcVoltage * SENSOR_OUTPUT_DIVIDER;
  float pressureKpa =
    (sensorVoltage - MPXV7002_ZERO_PRESSURE_V) / MPXV7002_SENSITIVITY_V_PER_KPA;

  return pressureKpa + PRESSURE_OFFSET_KPA;
}

const char* getPressureRangeLabel(float pressureKpa) {
  if (pressureKpa < 0.2f) {
    return "MUY DEBIL";
  }
  if (pressureKpa < 0.8f) {
    return "BAJO";
  }
  if (pressureKpa < 1.5f) {
    return "ACEPTABLE";
  }
  if (pressureKpa < 3.0f) {
    return "CORRECTO";
  }
  if (pressureKpa < 4.5f) {
    return "FUERTE";
  }
  return "EXCESIVO";
}

const char* getSpo2StatusLabel() {
  if (!validSpO2 || spo2 <= 0) {
    return "SIN DATO";
  }

  int32_t spo2Value = static_cast<int32_t>(spo2Filtered + 0.5f);
  if (spo2Value < 90) {
    return "CRITICO";
  }
  if (spo2Value < 95) {
    return "BAJO";
  }
  return "NORMAL";
}

const char* getStateLabel() {
  switch (breathingState) {
    case STATE_WAIT_FINGER:
      return "ESPERANDO DEDO";
    case STATE_READY_TO_TEST:
      return "LISTO";
    case STATE_SAMPLING:
      return "TOMANDO MUESTRA";
    case STATE_RESULT:
      return "MUESTRA TERMINADA";
    default:
      return "DESCONOCIDO";
  }
}

const char* getSampleQualityLabel(float pressureKpa) {
  if (pressureKpa >= 1.5f && pressureKpa <= 4.5f) {
    return "BUENA";
  }
  if (pressureKpa >= 0.8f) {
    return "REGULAR";
  }
  return "REPETIR";
}

void startSample() {
  breathingState = STATE_SAMPLING;
  samplePeakPressureKpa = lungPressureKpa;
  sampleAveragePressureKpa = 0.0f;
  sampleDurationMs = 0;
  sampleStartMs = millis();
  sampleLastActiveMs = millis();
  samplePoints = 0;
}

void finishSample() {
  breathingState = STATE_RESULT;
  resultStartMs = millis();
  lastSamplePeakPressureKpa = samplePeakPressureKpa;
  lastSampleDurationMs = sampleDurationMs;

  if (samplePoints > 0) {
    lastSampleAveragePressureKpa = sampleAveragePressureKpa / samplePoints;
  } else {
    lastSampleAveragePressureKpa = 0.0f;
  }
}
