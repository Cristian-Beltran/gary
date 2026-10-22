#include <Wire.h>
#include <math.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <WebSocketsClient.h>

/*
  Comunicacion remota deshabilitada temporalmente.
  Para restaurarla, descomentar este bloque y las secciones Wi-Fi/MQTT
  marcadas mas abajo.

  #include <WiFi.h>
  #include <PubSubClient.h>
*/

// ESP32 NodeMCU 40 pines
constexpr uint8_t I2C_SDA_PIN = 21;
constexpr uint8_t I2C_SCL_PIN = 22;
constexpr uint8_t VIBRATOR_PIN = 26;
constexpr uint8_t RELAY_RED_PIN = 18;
constexpr uint8_t RELAY_GREEN_PIN = 19;
constexpr uint8_t LUNG_PRESSURE_PIN = 35;  // ADC solo entrada
constexpr uint8_t AIR_FLOW_PIN = 34;       // ADC solo entrada

// Intervalos de actualizacion
// Un reporte completo ocupa varias lineas; 3 s evita que el monitor se desplace demasiado rapido.
constexpr unsigned long SERIAL_INTERVAL_MS = 3000;
constexpr unsigned long RESULT_SIGNAL_TIME_MS = 5000;
constexpr unsigned long MQTT_TELEMETRY_INTERVAL_MS = 500;
constexpr unsigned long MQTT_STATUS_INTERVAL_MS = 5000;

// Configure these values for the Mosquitto/Tailscale server used by the web app.
const char* WIFI_SSID = "REPLACE_WIFI_SSID";
const char* WIFI_PASSWORD = "REPLACE_WIFI_PASSWORD";
const char* MQTT_BROKER = "server-local.tail9af6ac.ts.net";
const uint16_t MQTT_PORT = 443;
const char* MQTT_WS_PATH = "/";
const char* MQTT_USER = "device";
const char* MQTT_PASSWORD = "esp32";
const char* MQTT_TOPIC_TELEMETRY = "gary/device/esp32-01/telemetry";
const char* MQTT_TOPIC_STATUS = "gary/device/esp32-01/status";
const char* MQTT_TOPIC_COMMAND = "gary/device/esp32-01/cmd";
const char* MQTT_TOPIC_ACK = "gary/device/esp32-01/cmd/ack";

/*
  Comunicacion remota deshabilitada temporalmente.
  constexpr unsigned long MQTT_TELEMETRY_INTERVAL_MS = 500;
  constexpr unsigned long MQTT_STATUS_INTERVAL_MS = 5000;
*/

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

// Parametros del SEN0360 / F1031V
constexpr float AIR_FLOW_SENSOR_RANGE_SLM = 150.0f;
constexpr float AIR_FLOW_SENSOR_ZERO_V = 0.5f;
constexpr float AIR_FLOW_SENSOR_FULL_SCALE_V = 4.5f;
constexpr float AIR_FLOW_SENSOR_OUTPUT_DIVIDER = 2.0f;
constexpr float AIR_FLOW_SMOOTHING = 0.20f;
constexpr float EXHALATION_FLOW_THRESHOLD_SLM = 0.8f;
constexpr float EXHALATION_END_THRESHOLD_SLM = 0.3f;
constexpr unsigned long EXHALATION_END_HOLD_MS = 350;
constexpr unsigned long RESPIRATORY_RATE_WINDOW_MS = 60000;
constexpr uint8_t RESPIRATION_HISTORY_SIZE = 12;

// Umbrales de emergencia local
constexpr float EMERGENCY_HEART_RATE_LOW_BPM = 45.0f;
constexpr float EMERGENCY_HEART_RATE_HIGH_BPM = 150.0f;
constexpr int32_t EMERGENCY_SPO2_LOW = 90;
constexpr float EMERGENCY_PRESSURE_HIGH_KPA = 4.5f;
constexpr float EMERGENCY_AIR_FLOW_HIGH_SLM = 140.0f;

/*
  Comunicacion remota deshabilitada temporalmente.
  const char* WIFI_SSID = "Estudiantes";
  const char* WIFI_PASSWORD = "EstWifi.0224";
  // const char* WIFI_SSID = "Cordova hogar ext";
  // const char* WIFI_PASSWORD = "4ndiNicol3";

  const char* MQTT_BROKER = "broker.hivemq.com";
  const uint16_t MQTT_PORT = 1883;
  const char* MQTT_TOPIC_TELEMETRY = "gary/device/telemetry";
  const char* MQTT_TOPIC_STATUS = "gary/device/status";
  const char* MQTT_TOPIC_CONTROL = "gary/device/control";
*/

enum BreathingState : uint8_t {
  STATE_WAIT_FINGER = 0,
  STATE_READY_TO_TEST,
  STATE_SAMPLING,
  STATE_RESULT
};

MAX30105 particleSensor;
constexpr size_t WS_RX_BUFFER_SIZE = 4096;
class WebSocketClientBridge : public Client {
 public:
  void setWebSocket(WebSocketsClient* client) { ws = client; }
  void setConnected(bool value) { connectedFlag = value; }
  void addData(const uint8_t* data, size_t length) { for (size_t i = 0; i < length; ++i) { size_t next = (head + 1) % WS_RX_BUFFER_SIZE; if (next != tail) { buffer[head] = data[i]; head = next; } } }
  int connect(const char*, uint16_t) override { return 1; }
  int connect(IPAddress, uint16_t) override { return 1; }
  size_t write(uint8_t value) override { return write(&value, 1); }
  size_t write(const uint8_t* data, size_t length) override { if (!connectedFlag || !ws) return 0; ws->sendBIN(data, length); return length; }
  int available() override { return head >= tail ? head - tail : WS_RX_BUFFER_SIZE - tail + head; }
  int read() override { if (!available()) return -1; uint8_t value = buffer[tail]; tail = (tail + 1) % WS_RX_BUFFER_SIZE; return value; }
  int read(uint8_t* data, size_t length) override { size_t count = 0; while (count < length && available()) data[count++] = read(); return count; }
  int peek() override { return available() ? buffer[tail] : -1; }
  void flush() override {}
  void stop() override { connectedFlag = false; }
  uint8_t connected() override { return connectedFlag; }
  operator bool() override { return connectedFlag; }
 private:
  WebSocketsClient* ws = nullptr; uint8_t buffer[WS_RX_BUFFER_SIZE]{}; size_t head = 0; size_t tail = 0; bool connectedFlag = false;
};
WebSocketsClient webSocket;
WebSocketClientBridge wsBridge;
PubSubClient mqttClient(wsBridge);
unsigned long lastMqttReconnectMs = 0;
/*
  Comunicacion remota deshabilitada temporalmente.
  WiFiClient wifiClient;
  PubSubClient mqttClient(wifiClient);
*/

float heartRateBpm = 0.0f;
int32_t spo2 = 0;
float spo2Filtered = 0.0f;
bool validHeartRate = false;
bool validSpO2 = false;
float lungPressureRawKpa = 0.0f;
float lungPressureKpa = 0.0f;
float lungPressureBaselineKpa = 0.0f;
float airFlowRawSlm = 0.0f;
float airFlowSlm = 0.0f;
float peakExpiratoryFlowSlm = 0.0f;
float respiratoryRateBpm = 0.0f;
float expiratoryVolumeLiters = 0.0f;
float currentExhalationPeakFlowSlm = 0.0f;
float currentExhalationVolumeLiters = 0.0f;
bool exhalationActive = false;
unsigned long exhalationBelowThresholdMs = 0;
unsigned long lastAirFlowSampleMs = 0;
unsigned long breathTimestampsMs[RESPIRATION_HISTORY_SIZE] = {0};
uint8_t breathHistoryCount = 0;
uint8_t breathHistoryIndex = 0;
bool pressureBaselineReady = false;
uint32_t lastIrValue = 0;
bool fingerDetected = false;
bool max30102Available = false;
int32_t max30102SamplesStored = 0;
int32_t max30102NewSamples = 0;
bool emergencyActive = false;
bool monitoringEnabled = false;
unsigned long lastMqttTelemetryMs = 0;
unsigned long lastMqttStatusMs = 0;

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

/*
  Comunicacion remota deshabilitada temporalmente.
  unsigned long lastMqttTelemetryMs = 0;
  unsigned long lastMqttStatusMs = 0;
*/

void initializeMax30102();
void initializePressureSensor();
void initializeAirFlowSensor();
void updatePressure();
void updateAirFlow();
void updateRespiratoryMetrics();
void updateMax30102();
void updateBreathingTest();
void updateOutputs();
void printTelemetry();
float readPressureKpa();
float readAirFlowSlm();
const char* getPressureRangeLabel(float pressureKpa);
const char* getSpo2StatusLabel();
const char* getStateLabel();
const char* getSampleQualityLabel(float pressureKpa);
bool isEmergencyCondition();
void startSample();
void finishSample();
void connectWifi();
void ensureMqttConnection();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishTelemetry();
void publishDeviceStatus();
void publishCommandAck(const String& commandId, bool accepted);
/*
  Comunicacion remota deshabilitada temporalmente.
  void connectWifi();
  void ensureMqttConnection();
  void mqttCallback(char* topic, byte* payload, unsigned int length);
  void publishTelemetry();
  void publishDeviceStatus();
*/

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(RELAY_RED_PIN, OUTPUT);
  pinMode(RELAY_GREEN_PIN, OUTPUT);
  digitalWrite(VIBRATOR_PIN, LOW);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  initializePressureSensor();
  initializeAirFlowSensor();
  initializeMax30102();

  connectWifi();
  setupWebSocket();
  mqttClient.setCallback(mqttCallback);

  /*
    Comunicacion remota deshabilitada temporalmente.
    connectWifi();
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
  */

  Serial.println();
  Serial.println("========================================");
  Serial.println("  Sistema Gary - Monitor local iniciado");
  Serial.println("  Salida: monitor serie a 115200 baudios");
  Serial.println("========================================");
}

void loop() {
  updatePressure();
  updateAirFlow();
  updateRespiratoryMetrics();
  updateMax30102();
  updateBreathingTest();
  emergencyActive = isEmergencyCondition();
  updateOutputs();

  if (WiFi.status() != WL_CONNECTED) connectWifi();
  webSocket.loop();
  ensureMqttConnection();
  mqttClient.loop();

  /*
    Comunicacion remota deshabilitada temporalmente.
    if (WiFi.status() != WL_CONNECTED) {
      connectWifi();
    }
    ensureMqttConnection();
    mqttClient.loop();
  */

  if (millis() - lastSerialPrintMs >= SERIAL_INTERVAL_MS) {
    lastSerialPrintMs = millis();
    printTelemetry();
  }

  if (monitoringEnabled && millis() - lastMqttTelemetryMs >= MQTT_TELEMETRY_INTERVAL_MS) {
    lastMqttTelemetryMs = millis();
    publishTelemetry();
  }
  if (millis() - lastMqttStatusMs >= MQTT_STATUS_INTERVAL_MS) {
    lastMqttStatusMs = millis();
    publishDeviceStatus();
  }

  /*
    Comunicacion remota deshabilitada temporalmente.
    if (millis() - lastMqttTelemetryMs >= MQTT_TELEMETRY_INTERVAL_MS) {
      lastMqttTelemetryMs = millis();
      publishTelemetry();
    }

    if (millis() - lastMqttStatusMs >= MQTT_STATUS_INTERVAL_MS) {
      lastMqttStatusMs = millis();
      publishDeviceStatus();
    }
  */
}

/*
  Comunicacion remota deshabilitada temporalmente.

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
    mqttClient.subscribe(MQTT_TOPIC_CONTROL);
    publishDeviceStatus();
    Serial.println("MQTT conectado");
  } else {
    Serial.print("MQTT fallo rc=");
    Serial.println(mqttClient.state());
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_TOPIC_CONTROL) != 0) {
    return;
  }

  String message;
  message.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    message += static_cast<char>(payload[i]);
  }

  if (message.indexOf("\"monitoringEnabled\":true") >= 0) {
    monitoringEnabled = true;
  } else if (message.indexOf("\"monitoringEnabled\":false") >= 0) {
    monitoringEnabled = false;
  }

  publishDeviceStatus();
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
  payload += "\"airFlow\":" + String(airFlowSlm, 2) + ",";
  payload += "\"peakExpiratoryFlow\":" + String(peakExpiratoryFlowSlm, 2) + ",";
  payload += "\"respiratoryRate\":" + String(respiratoryRateBpm, 2) + ",";
  payload += "\"expiratoryVolume\":" + String(expiratoryVolumeLiters, 3) + ",";
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
  payload += "\"monitoringEnabled\":" + String(monitoringEnabled ? "true" : "false") + ",";
  payload += "\"emergencyActive\":" + String(emergencyActive ? "true" : "false") + ",";
  payload += "\"ip\":\"" + ip + "\",";
  payload += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"timestamp\":" + String(millis());
  payload += "}";

  mqttClient.publish(MQTT_TOPIC_STATUS, payload.c_str(), true);
}

*/

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) { wsBridge.setConnected(true); Serial.println("WSS conectado"); }
  else if (type == WStype_DISCONNECTED) { wsBridge.setConnected(false); if (mqttClient.connected()) mqttClient.disconnect(); }
  else if (type == WStype_BIN) wsBridge.addData(payload, length);
}

void setupWebSocket() {
  wsBridge.setWebSocket(&webSocket);
  webSocket.beginSSL(MQTT_BROKER, MQTT_PORT, MQTT_WS_PATH, nullptr, "mqtt");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  mqttClient.setBufferSize(2048);
  mqttClient.setKeepAlive(30);
  mqttClient.setCallback(mqttCallback);
}

void ensureMqttConnection() {
  if (mqttClient.connected() || WiFi.status() != WL_CONNECTED || !wsBridge.connected()) return;
  if (millis() - lastMqttReconnectMs < 5000) return;
  lastMqttReconnectMs = millis();
  String clientId = "gary-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  String willPayload = "{\"online\":false,\"mqttConnected\":false,\"wifiConnected\":false}";
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, MQTT_TOPIC_STATUS, 1, true, willPayload.c_str())) {
    mqttClient.subscribe(MQTT_TOPIC_COMMAND, 1);
    publishDeviceStatus();
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_TOPIC_COMMAND) != 0) return;
  String message;
  for (unsigned int i = 0; i < length; ++i) message += static_cast<char>(payload[i]);
  bool start = message.indexOf("START_MEASUREMENT") >= 0;
  bool stop = message.indexOf("STOP_MEASUREMENT") >= 0;
  String commandId = "";
  int idAt = message.indexOf("\"commandId\":\"");
  if (idAt >= 0) { idAt += 13; int end = message.indexOf('"', idAt); if (end > idAt) commandId = message.substring(idAt, end); }
  if (start) monitoringEnabled = true;
  if (stop) monitoringEnabled = false;
  publishCommandAck(commandId, start || stop);
  publishDeviceStatus();
}

void publishCommandAck(const String& commandId, bool accepted) {
  if (!mqttClient.connected()) return;
  String payload = "{\"commandId\":\"" + commandId + "\",\"accepted\":" + String(accepted ? "true" : "false") + ",\"monitoringEnabled\":" + String(monitoringEnabled ? "true" : "false") + ",\"timestamp\":" + String(millis()) + "}";
  mqttClient.publish(MQTT_TOPIC_ACK, payload.c_str(), false);
}

void publishTelemetry() {
  if (!mqttClient.connected()) return;
  String payload = "{";
  payload += "\"pulse\":" + String(validHeartRate ? int(heartRateBpm + 0.5f) : 0) + ",";
  payload += "\"oxygenSaturation\":" + String(validSpO2 ? int(spo2Filtered + 0.5f) : 0) + ",";
  payload += "\"lungCapacity\":" + String(lungPressureKpa, 3) + ",\"airFlow\":" + String(airFlowSlm, 2) + ",";
  payload += "\"peakExpiratoryFlow\":" + String(peakExpiratoryFlowSlm, 2) + ",\"respiratoryRate\":" + String(respiratoryRateBpm, 2) + ",";
  payload += "\"expiratoryVolume\":" + String(expiratoryVolumeLiters, 3) + ",\"state\":\"" + String(getStateLabel()) + "\",\"timestamp\":" + String(millis()) + "}";
  mqttClient.publish(MQTT_TOPIC_TELEMETRY, payload.c_str(), false);
}

void publishDeviceStatus() {
  if (!mqttClient.connected()) return;
  String payload = "{\"online\":true,\"mqttConnected\":true,\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  payload += "\"monitoringEnabled\":" + String(monitoringEnabled ? "true" : "false") + ",\"emergencyActive\":" + String(emergencyActive ? "true" : "false") + ",";
  payload += "\"rssi\":" + String(WiFi.RSSI()) + ",\"timestamp\":" + String(millis()) + "}";
  mqttClient.publish(MQTT_TOPIC_STATUS, payload.c_str(), true);
}

void initializePressureSensor() {
  analogReadResolution(12);
  analogSetPinAttenuation(LUNG_PRESSURE_PIN, ADC_11db);
}

void initializeAirFlowSensor() {
  analogReadResolution(12);
  analogSetPinAttenuation(AIR_FLOW_PIN, ADC_11db);
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

void updateAirFlow() {
  airFlowRawSlm = readAirFlowSlm();

  if (airFlowRawSlm < 0.0f) {
    airFlowRawSlm = 0.0f;
  }

  if (airFlowRawSlm > AIR_FLOW_SENSOR_RANGE_SLM) {
    airFlowRawSlm = AIR_FLOW_SENSOR_RANGE_SLM;
  }

  airFlowSlm = airFlowSlm + ((airFlowRawSlm - airFlowSlm) * AIR_FLOW_SMOOTHING);
}

void updateRespiratoryMetrics() {
  unsigned long now = millis();
  if (lastAirFlowSampleMs == 0) {
    lastAirFlowSampleMs = now;
    return;
  }

  float deltaSeconds = (now - lastAirFlowSampleMs) / 1000.0f;
  lastAirFlowSampleMs = now;

  if (deltaSeconds <= 0.0f || deltaSeconds > 1.0f) {
    return;
  }

  if (!exhalationActive && airFlowSlm >= EXHALATION_FLOW_THRESHOLD_SLM) {
    exhalationActive = true;
    exhalationBelowThresholdMs = 0;
    currentExhalationPeakFlowSlm = airFlowSlm;
    currentExhalationVolumeLiters = 0.0f;
  }

  if (exhalationActive) {
    if (airFlowSlm > currentExhalationPeakFlowSlm) {
      currentExhalationPeakFlowSlm = airFlowSlm;
    }

    if (airFlowSlm > EXHALATION_END_THRESHOLD_SLM) {
      currentExhalationVolumeLiters += (airFlowSlm / 60.0f) * deltaSeconds;
      exhalationBelowThresholdMs = 0;
    } else if (exhalationBelowThresholdMs == 0) {
      exhalationBelowThresholdMs = now;
    }

    if (exhalationBelowThresholdMs > 0 &&
        now - exhalationBelowThresholdMs >= EXHALATION_END_HOLD_MS) {
      exhalationActive = false;
      peakExpiratoryFlowSlm = currentExhalationPeakFlowSlm;
      expiratoryVolumeLiters = currentExhalationVolumeLiters;

      breathTimestampsMs[breathHistoryIndex] = now;
      breathHistoryIndex = (breathHistoryIndex + 1) % RESPIRATION_HISTORY_SIZE;
      if (breathHistoryCount < RESPIRATION_HISTORY_SIZE) {
        breathHistoryCount++;
      }

      uint8_t validBreaths = 0;
      unsigned long oldestBreathMs = now;
      for (uint8_t i = 0; i < breathHistoryCount; i++) {
        unsigned long breathMs = breathTimestampsMs[i];
        if (breathMs > 0 && now - breathMs <= RESPIRATORY_RATE_WINDOW_MS) {
          validBreaths++;
          if (breathMs < oldestBreathMs) {
            oldestBreathMs = breathMs;
          }
        }
      }

      if (validBreaths >= 2 && oldestBreathMs < now) {
        float windowMinutes = (now - oldestBreathMs) / 60000.0f;
        if (windowMinutes > 0.0f) {
          respiratoryRateBpm = (validBreaths - 1) / windowMinutes;
        }
      } else if (validBreaths == 1) {
        respiratoryRateBpm = 0.0f;
      }

      currentExhalationPeakFlowSlm = 0.0f;
      currentExhalationVolumeLiters = 0.0f;
      exhalationBelowThresholdMs = 0;
    }
  }

  if (!exhalationActive && airFlowSlm < EXHALATION_END_THRESHOLD_SLM) {
    bool hasRecentBreath = false;
    for (uint8_t i = 0; i < breathHistoryCount; i++) {
      unsigned long breathMs = breathTimestampsMs[i];
      if (breathMs > 0 && now - breathMs <= RESPIRATORY_RATE_WINDOW_MS) {
        hasRecentBreath = true;
        break;
      }
    }

    if (!hasRecentBreath) {
      respiratoryRateBpm = 0.0f;
      peakExpiratoryFlowSlm = 0.0f;
      expiratoryVolumeLiters = 0.0f;
    }
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
  bool redOn = emergencyActive;
  bool greenOn = fingerDetected && breathingState == STATE_READY_TO_TEST;
  bool vibratorOn = emergencyActive;

  digitalWrite(RELAY_RED_PIN, redOn ? HIGH : LOW);
  digitalWrite(RELAY_GREEN_PIN, greenOn ? HIGH : LOW);
  digitalWrite(VIBRATOR_PIN, vibratorOn ? HIGH : LOW);
}

void printTelemetry() {
  Serial.println();
  Serial.println("----------------------------------------");
  Serial.print("Tiempo de ejecucion: ");
  Serial.print(millis() / 1000.0f, 1);
  Serial.println(" s");

  Serial.println("[SISTEMA]");
  Serial.print("Estado: ");
  Serial.println(getStateLabel());
  Serial.print("MAX30102: ");
  Serial.println(max30102Available ? "DISPONIBLE" : "NO DETECTADO");
  Serial.print("Dedo: ");
  Serial.println(fingerDetected ? "DETECTADO" : "NO DETECTADO");
  Serial.print("IR actual: ");
  Serial.println(lastIrValue);
  Serial.print("Muestras MAX30102 en buffer: ");
  Serial.println(max30102SamplesStored);

  Serial.println("[SIGNOS VITALES]");
  Serial.print("Pulso: ");
  if (validHeartRate && heartRateBpm > 0.0f) {
    Serial.print(heartRateBpm, 1);
    Serial.println(" bpm");
  } else {
    Serial.println("SIN LECTURA VALIDA");
  }

  Serial.print("SpO2: ");
  if (validSpO2 && spo2Filtered > 0.0f) {
    Serial.print(static_cast<int32_t>(spo2Filtered + 0.5f));
    Serial.print(" % (");
    Serial.print(getSpo2StatusLabel());
    Serial.println(")");
  } else {
    Serial.println("SIN LECTURA VALIDA");
  }

  Serial.println("[RESPIRACION]");
  Serial.print("Presion cruda: ");
  Serial.print(lungPressureRawKpa, 3);
  Serial.println(" kPa");
  Serial.print("Linea base de presion: ");
  Serial.print(lungPressureBaselineKpa, 3);
  Serial.println(" kPa");
  Serial.print("Presion corregida: ");
  Serial.print(lungPressureKpa, 3);
  Serial.print(" kPa (");
  Serial.println(getPressureRangeLabel(lungPressureKpa));

  Serial.print("Flujo crudo: ");
  Serial.print(airFlowRawSlm, 2);
  Serial.println(" SLM");
  Serial.print("Flujo filtrado: ");
  Serial.print(airFlowSlm, 2);
  Serial.println(" SLM");
  Serial.print("Exhalacion en curso: ");
  Serial.println(exhalationActive ? "SI" : "NO");
  Serial.print("Flujo pico espiratorio (PEF): ");
  Serial.print(peakExpiratoryFlowSlm, 2);
  Serial.println(" SLM");
  Serial.print("Frecuencia respiratoria: ");
  Serial.print(respiratoryRateBpm, 2);
  Serial.println(" rpm");
  Serial.print("Volumen espiratorio: ");
  Serial.print(expiratoryVolumeLiters, 3);
  Serial.println(" L");

  Serial.println("[SEGURIDAD Y SALIDAS]");
  Serial.print("Emergencia: ");
  Serial.println(emergencyActive ? "ACTIVA" : "NO ACTIVA");
  Serial.print("Rele rojo / vibrador: ");
  Serial.println(emergencyActive ? "ENCENDIDOS" : "APAGADOS");
  Serial.print("Rele verde (listo para medir): ");
  Serial.println(fingerDetected && breathingState == STATE_READY_TO_TEST ? "ENCENDIDO" : "APAGADO");

  Serial.println("[MUESTRA RESPIRATORIA]");
  if (breathingState == STATE_SAMPLING) {
    Serial.print("Muestra en curso - Pico: ");
    Serial.print(samplePeakPressureKpa, 3);
    Serial.print(" kPa | Duracion: ");
    Serial.print(sampleDurationMs / 1000.0f, 1);
    Serial.println(" s");
  } else if (lastSampleDurationMs > 0) {
    Serial.print("Ultimo resultado: ");
    Serial.print(getSampleQualityLabel(lastSamplePeakPressureKpa));
    Serial.print(" | Fuerza: ");
    Serial.print(getPressureRangeLabel(lastSamplePeakPressureKpa));
    Serial.print(" | Pico: ");
    Serial.print(lastSamplePeakPressureKpa, 3);
    Serial.print(" kPa | Promedio: ");
    Serial.print(lastSampleAveragePressureKpa, 3);
    Serial.print(" kPa | Duracion: ");
    Serial.print(lastSampleDurationMs / 1000.0f, 1);
    Serial.println(" s");
  } else {
    Serial.println("Aun no hay una muestra finalizada.");
  }
}

float readPressureKpa() {
  uint16_t rawAdc = analogRead(LUNG_PRESSURE_PIN);
  float adcVoltage = (static_cast<float>(rawAdc) / ADC_RESOLUTION) * ADC_REFERENCE_V;
  float sensorVoltage = adcVoltage * SENSOR_OUTPUT_DIVIDER;
  float pressureKpa =
    (sensorVoltage - MPXV7002_ZERO_PRESSURE_V) / MPXV7002_SENSITIVITY_V_PER_KPA;

  return pressureKpa + PRESSURE_OFFSET_KPA;
}

float readAirFlowSlm() {
  uint16_t rawAdc = analogRead(AIR_FLOW_PIN);
  float adcVoltage = (static_cast<float>(rawAdc) / ADC_RESOLUTION) * ADC_REFERENCE_V;
  float sensorVoltage = adcVoltage * AIR_FLOW_SENSOR_OUTPUT_DIVIDER;
  float flowSlm =
    AIR_FLOW_SENSOR_RANGE_SLM *
    ((sensorVoltage - AIR_FLOW_SENSOR_ZERO_V) /
     (AIR_FLOW_SENSOR_FULL_SCALE_V - AIR_FLOW_SENSOR_ZERO_V));

  if (flowSlm < 0.0f) {
    return 0.0f;
  }

  if (flowSlm > AIR_FLOW_SENSOR_RANGE_SLM) {
    return AIR_FLOW_SENSOR_RANGE_SLM;
  }

  return flowSlm;
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

bool isEmergencyCondition() {
  if (validSpO2 && spo2Filtered > 0.0f && spo2Filtered < EMERGENCY_SPO2_LOW) {
    return true;
  }

  if (validHeartRate &&
      (heartRateBpm < EMERGENCY_HEART_RATE_LOW_BPM ||
       heartRateBpm > EMERGENCY_HEART_RATE_HIGH_BPM)) {
    return true;
  }

  if (lungPressureKpa >= EMERGENCY_PRESSURE_HIGH_KPA) {
    return true;
  }

  if (airFlowSlm >= EMERGENCY_AIR_FLOW_HIGH_SLM) {
    return true;
  }

  return false;
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
