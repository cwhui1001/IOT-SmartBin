#include <Servo.h>
#include <SoftwareSerial.h>

/* ==================== CONFIG ==================== */
SoftwareSerial EspSerial(2, 3); // RX, TX

String SSID_NAME = "Maxis_2289";   
String SSID_PASS = "22896188"; 

// ThingSpeak Settings
String THINGSPEAK_HOST = "api.thingspeak.com";
String WRITE_API_KEY   = "OTVEY8LE4CEAFIEU"; 

/* ==================== PIN ASSIGNMENTS ==================== */
const int trigHand = 10;
const int echoHand = 11;
const int trigBin  = 12;
const int echoBin  = 13;

const int ledPin    = A1;
const int buzzerPin = A2;
const int servoPin  = 9;
const int flamePin  = A0;

/* ==================== THRESHOLDS ==================== */
int flameThreshold   = 1000;
int handOpenDistance = 8;
int binFullDistance  = 2;

const int SERVO_OPEN   = 90;
const int SERVO_CLOSED = 0;

Servo lidServo;
unsigned long lastUploadTime = 0;
unsigned long lastDebugTime = 0;
const long uploadInterval = 15000; // 15 seconds (ThingSpeak limit is 15s)

/* ==================== FUNCTIONS ==================== */
// Smart Filter: Average of 3 readings, ignoring errors
int getDistanceCM(int trigPin, int echoPin) {
  long total = 0;
  int validCount = 0;
  
  for (int i = 0; i < 3; i++) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    
    long duration = pulseIn(echoPin, HIGH, 30000);
    int dist = duration / 29 / 2;
    
    // Accept only valid readings (2cm to 400cm)
    if (duration > 0 && dist >= 2 && dist < 400) {
      total += dist;
      validCount++;
    }
    delay(10); // Small delay between pings
  }
  
  if (validCount > 0) return total / validCount;
  return 0; // Return 0 if sensor times out (Sensor Error or Out of Range)
}

String sendAT(String cmd, int timeout = 1000, String target = "") {
  String resp = "";
  EspSerial.println(cmd);
  long t = millis();
  while (millis() - t < timeout) {
    while (EspSerial.available()) {
      resp += (char)EspSerial.read();
    }
    if (target != "" && resp.indexOf(target) != -1) break;
  }
  return resp;
}

/* ==================== SETUP ==================== */
void setup() {
  Serial.begin(115200);
  EspSerial.begin(9600);

  Serial.println("==== SMART BIN (ThingSpeak Mode) ====");

  pinMode(trigHand, OUTPUT);
  pinMode(echoHand, INPUT);
  pinMode(trigBin, OUTPUT);
  pinMode(echoBin, INPUT);
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  // Servo Init
  lidServo.attach(servoPin);
  lidServo.write(SERVO_CLOSED);
  delay(50); 
  lidServo.detach();

  // -------- ESP INIT --------
  sendAT("AT+RST", 2000);
  sendAT("AT+CWMODE=1");
  sendAT("AT+CIPMUX=0");
  
  Serial.println("Connecting to WiFi...");
  String wifiResp = sendAT(
    "AT+CWJAP=\"" + SSID_NAME + "\",\"" + SSID_PASS + "\"",
    15000
  );

  Serial.println(wifiResp);

  if (wifiResp.indexOf("WIFI GOT IP") != -1) {
    Serial.println("✅ WiFi Connected!");
    for (int i = 0; i < 3; i++) {
      digitalWrite(ledPin, HIGH); delay(500);
      digitalWrite(ledPin, LOW);  delay(500);
    }
  } else {
    Serial.println("❌ WiFi FAILED!");
  }
}

/* ==================== LOOP ==================== */
void loop() {
  int handDist = getDistanceCM(trigHand, echoHand);
  int binDist  = getDistanceCM(trigBin, echoBin);
  int flameVal = analogRead(flamePin);

  String lidStatus = (handDist > 0 && handDist <= handOpenDistance) ? "OPEN" : "CLOSED";
  String binStatus = (binDist > 0 && binDist <= binFullDistance) ? "FULL" : "NOT FULL";

  // -------- ACTUATORS (Responsive) --------
  if (lidStatus == "OPEN") {
    if (!lidServo.attached()) lidServo.attach(servoPin);
    lidServo.write(SERVO_OPEN);
    delay(2000);
  } else {
    if (lidServo.attached()) {
      lidServo.write(SERVO_CLOSED);
      delay(50);
      lidServo.detach();
    }
  }

  digitalWrite(ledPin, binStatus == "FULL");
  if (flameVal < flameThreshold) tone(buzzerPin, 2000);
  else noTone(buzzerPin);

  // -------- SERIAL DEBUG (Throttled to 1s) --------
  if (millis() - lastDebugTime > 1000) {
    Serial.print("Hand: ");  Serial.print(handDist);  Serial.print(" cm | ");
    Serial.print("Bin: ");   Serial.print(binDist);   Serial.print(" cm | ");
    Serial.print("Flame: "); Serial.print(flameVal);  Serial.print(" | ");
    Serial.print("LID: ");   Serial.print(lidStatus); Serial.print(" | ");
    Serial.print("BIN: ");   Serial.println(binStatus);
    lastDebugTime = millis();
  }

  // -------- UPLOAD TO THINGSPEAK (Every 16s) --------
  if (millis() - lastUploadTime > uploadInterval) {
    Serial.println("📤 Uploading to ThingSpeak...");
    
    // Field Mapping:
    // Field 1: Hand Distance
    // Field 2: Bin Distance
    // Field 3: Flame Value
    // Field 4: Lid Status (1=OPEN, 0=CLOSED)
    // Field 5: Bin Status (1=FULL, 0=NOT FULL)
    
    int lidInt = (lidStatus == "OPEN") ? 1 : 0;
    int binInt = (binStatus == "FULL") ? 1 : 0;

    String url = "/update?api_key=" + WRITE_API_KEY + 
                 "&field1=" + String(handDist) + 
                 "&field2=" + String(binDist) + 
                 "&field3=" + String(flameVal) +
                 "&field4=" + String(lidInt) +
                 "&field5=" + String(binInt);

    // Start Connection (Port 80 is much faster/easier than 443)
    String startRes = sendAT("AT+CIPSTART=\"TCP\",\"" + THINGSPEAK_HOST + "\",80", 2000, "OK");

    if (startRes.indexOf("OK") != -1 || startRes.indexOf("CONNECT") != -1) {
      String httpReq = "GET " + url + " HTTP/1.1\r\n" +
                       "Host: " + THINGSPEAK_HOST + "\r\n" +
                       "Connection: close\r\n\r\n";
                       
      sendAT("AT+CIPSEND=" + String(httpReq.length()), 1000, ">");
      EspSerial.print(httpReq);
      
      // Wait for response briefly
      long t = millis();
      while (millis() - t < 1000) {
        if (EspSerial.available()) Serial.write(EspSerial.read());
      }
      Serial.println("\n✅ Sent!");
    } else {
      Serial.println("⚠️ Connection Failed");
      sendAT("AT+CIPCLOSE", 200);
    }
    
    lastUploadTime = millis();
    // Wait for power to stabilize after WiFi burst to prevent "1cm" noise
    delay(1000);
  }
  
  delay(100); // Fast loop for responsive lid, but slow debug output
}
