# LiquidTrack IoT

LiquidTrack enables ESP8266-based smart scales to automatically log beverage consumption.

<figure>
  <img src="../../assets/screenshots/liquidtrack-full.png" alt="LiquidTrack System" class="screenshot">
  <figcaption class="screenshot-caption">LiquidTrack device management and event log</figcaption>
</figure>

## Overview

LiquidTrack provides:

- **Automatic Logging**: Weight changes detected and logged
- **Macro Tracking**: Beverage macros added to daily totals
- **Refill Detection**: Distinguishes consumption from refills
- **Multi-Scale Support**: Connect multiple devices

## How It Works

```
Scale detects weight change → ESP8266 sends event → 
ChefByte API validates → Event stored → Macros updated
```

### Event Types

| Event | Detection | Action |
|-------|-----------|--------|
| Consumption | Weight decrease | Log consumption, add macros |
| Refill | Weight increase | Update current amount |
| Pickup | Brief weight change | Ignored (noise) |

## Hardware Requirements

### Components

- ESP8266 board (NodeMCU, Wemos D1 Mini)
- HX711 load cell amplifier
- Load cell (1-5kg capacity)
- Power supply (5V USB)

### Wiring

```
Load Cell → HX711:
  E+ → E+
  E- → E-
  A- → A-
  A+ → A+

HX711 → ESP8266:
  VCC → 3.3V
  GND → GND
  DT  → D2 (GPIO4)
  SCK → D3 (GPIO0)
```

## Firmware Setup

### 1. Install Arduino IDE

Download from [arduino.cc](https://www.arduino.cc/en/software)

### 2. Add ESP8266 Board

1. File → Preferences
2. Add to Additional Board URLs:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Tools → Board → Boards Manager
4. Search "esp8266" and install

### 3. Install Libraries

Sketch → Include Library → Manage Libraries:

- HX711 by Rob Tillaart
- ESP8266WiFi (included with board)
- ESP8266HTTPClient (included)
- ArduinoJson

### 4. Configure Firmware

```cpp
// config.h
#define WIFI_SSID "YourWiFi"
#define WIFI_PASSWORD "YourPassword"
#define API_URL "https://chefbyte.app/api/liquidtrack"
#define API_KEY "lt_your_key_here"
#define SCALE_ID "kitchen-coffee"
```

### 5. Upload

1. Connect ESP8266 via USB
2. Select board: NodeMCU 1.0
3. Select correct COM port
4. Click Upload

## ChefByte Configuration

### Generate Device Key

1. Go to Settings → LiquidTrack
2. Click "Generate Device Key"
3. Copy the key immediately (only shown once!)
4. Enter key in firmware config

<figure>
  <img src="../../assets/screenshots/liquidtrack-key.png" alt="Device Key Generation" class="screenshot">
  <figcaption class="screenshot-caption">Generating a new device API key</figcaption>
</figure>

### Key Security

- Keys are hashed before storage
- Cannot be retrieved after generation
- Delete key to revoke access
- Generate new key anytime

## Product Configuration

Link beverages to scales:

1. Create product (e.g., "Cold Brew Coffee")
2. Set nutrition per serving
3. Note the scale_id used in firmware
4. Events will auto-match by scale_id

## Event Log

View consumption history:

| Field | Description |
|-------|-------------|
| Timestamp | When event occurred |
| Scale ID | Which device |
| Weight Before | Starting weight (g) |
| Weight After | Ending weight (g) |
| Consumed | Calculated amount (ml) |
| Is Refill | Whether it was a refill |
| Product | Linked product name |
| Macros | Calculated nutrition |

## API Endpoints

### POST /api/liquidtrack

Log consumption events.

**Headers:**

```
x-api-key: lt_your_key_here
Content-Type: application/json
```

**Body:**

```json
{
  "scale_id": "kitchen-coffee",
  "events": [
    {
      "timestamp": "2024-01-15T08:30:00Z",
      "weight_before": 500,
      "weight_after": 350,
      "is_refill": false
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "count": 1
}
```

## Troubleshooting

### No Events Appearing

1. Check WiFi connection on ESP8266
2. Verify API key is correct
3. Check API URL in firmware
4. Review serial monitor for errors

### Incorrect Weights

1. Recalibrate scale with known weight
2. Check HX711 connections
3. Ensure stable surface
4. Avoid vibrations

### Events Not Counting Macros

1. Verify product is linked to scale_id
2. Check product has nutrition data
3. Ensure event is not marked as refill

## Advanced Configuration

### Calibration

```cpp
// In setup()
scale.set_scale(2280.f);  // Adjust for your load cell
scale.tare();
```

Calibration steps:

1. Remove all weight, note reading
2. Add known weight (e.g., 500g)
3. Calculate factor: (reading_with_weight - reading_empty) / actual_weight
4. Set factor in code

### Multiple Scales

Each scale needs:

- Unique scale_id
- Can share API key
- Products linked by scale_id

### Battery Operation

For battery-powered scales:

- Use deep sleep between readings
- Wake on weight change
- Send batched events
- Optimize for low power

## Example Firmware

Complete example available in the GitHub repository:

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <HX711.h>
#include <ArduinoJson.h>

// Configuration
const char* WIFI_SSID = "YourWiFi";
const char* WIFI_PASS = "YourPassword";
const char* API_URL = "https://chefbyte.app/api/liquidtrack";
const char* API_KEY = "lt_your_key";
const char* SCALE_ID = "kitchen-scale";

HX711 scale;
float lastWeight = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize scale
  scale.begin(D2, D3);
  scale.set_scale(2280.f);
  scale.tare();
  
  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  lastWeight = scale.get_units(10);
}

void loop() {
  float currentWeight = scale.get_units(10);
  float diff = lastWeight - currentWeight;
  
  // Detect significant change
  if (abs(diff) > 20) {
    sendEvent(lastWeight, currentWeight, diff < 0);
    lastWeight = currentWeight;
  }
  
  delay(1000);
}

void sendEvent(float before, float after, bool isRefill) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  StaticJsonDocument<256> doc;
  doc["scale_id"] = SCALE_ID;
  JsonArray events = doc.createNestedArray("events");
  JsonObject event = events.createNestedObject();
  event["weight_before"] = before;
  event["weight_after"] = after;
  event["is_refill"] = isRefill;
  
  String json;
  serializeJson(doc, json);
  
  int code = http.POST(json);
  http.end();
}
```

