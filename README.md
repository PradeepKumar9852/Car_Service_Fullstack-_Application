# 🚗 Precision AutoCare AI — Car Service Voice & Chat Agent Backend

A production-ready Node.js and Express backend for an intelligent **Automotive Service Voice & Chat AI Agent**. It incorporates a local structured Knowledge Base, strict diagnostic & safety triage protocols, and a conversational step-by-step customer intake system.

---

## 🌟 Key Features

1. **RESTful Chat & Intake API (`POST /api/chat`)**:
   - Takes incoming conversational text or voice transcriptions.
   - Manages session state, message history, and customer profile updates.
2. **Local Automotive Knowledge Base**:
   - 8 Diagnostic Categories:
     - ⚙️ **Engine Issues** (Misfires, Check Engine Light, Stalling, Rough Idle)
     - 🔋 **Battery & Electrical** (Clicking no-crank, Parasitic drain, Alternator warning)
     - 🌡️ **Overheating & Cooling** (Steam from hood, Red gauge, Coolant leaks)
     - 🛑 **Braking System** (Soft/spongy pedal to floor, Squeal, Metallic grinding)
     - 🛞 **Tyres & TPMS** (Pressure loss, Blowout hazards, Tread wear, Vibration)
     - 🔄 **Transmission & Drivetrain** (Slipping gears, Delayed shift, Burnt fluid)
     - ❄️ **Air Conditioning & Climate** (Warm air blowing, Odors, Compressor squeal)
     - 🔊 **Unusual Noises** (Lifter tick, Bottom-end knock, Wheel bearing drone, Suspension clunk)
3. **Strict Safety & Escalation Directives**:
   - **Never Give Definitive Diagnoses**: AI provides advisory context without guessing or guaranteeing mechanical faults.
   - **Always Recommend Certified Inspection**: Instructs physical evaluation by a professional mechanic.
   - **Emergency Safety Triage**: If smoke, flames, severe brake failure, boiling steam, or oil pressure loss is detected, the agent immediately issues emergency pull-over and flatbed towing instructions.
4. **Step-by-Step Customer Intake**:
   - Gathers 7 vital intake items across natural dialogue:
     1. `name` (Full Customer Name)
     2. `phone` (Contact Number)
     3. `makeModel` (Vehicle Make and Model)
     4. `year` (Model Year)
     5. `complaint` (Symptom or service needed)
     6. `mileage` (Odometer reading)
     7. `drivableStatus` (`Drivable`, `Not Drivable`, `Unsafe to Drive`)
5. **Flexible LLM Provider + Built-in Offline Fallback Engine**:
   - Integrates with **OpenAI API** (`gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`) via strict JSON output parsing.
   - Includes a deterministic, rule-based **Intelligent Automotive Triage Engine** that operates seamlessly even when no API key is provided.
6. **Interactive Real-Time Web Console**:
   - Modern dark-mode UI with live customer profile tracker, voice recording (Web Speech API), speech synthesis (TTS), diagnostic HUD, and Knowledge Base search inspector.

---

## 📁 Project Structure

```
CarSeviceVoiceAgent/
├── package.json
├── .env.example
├── .env
├── README.md
├── test/
│   └── api.test.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── env.js
│   ├── knowledgeBase/
│   │   ├── categories/
│   │   │   ├── engine.json
│   │   │   ├── battery.json
│   │   │   ├── overheating.json
│   │   │   ├── brakes.json
│   │   │   ├── tyres.json
│   │   │   ├── transmission.json
│   │   │   ├── ac.json
│   │   │   ├── noises.json
│   │   │   └── safetyEscalation.json
│   │   └── index.js
│   ├── prompts/
│   │   └── systemPrompt.js
│   ├── services/
│   │   ├── chatService.js
│   │   ├── sessionService.js
│   │   └── llmService.js
│   ├── controllers/
│   │   └── chatController.js
│   └── routes/
│       └── chatRoutes.js
└── frontend/                          # React + Tailwind CSS Application
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── index.css
        ├── main.jsx
        ├── App.jsx
        └── components/
            ├── Header.jsx
            ├── IntakeProgressCard.jsx
            ├── DiagnosticCard.jsx
            ├── SafetyAlertBanner.jsx
            ├── ChatMessage.jsx
            ├── QuickScenarios.jsx
            ├── VoiceInputBar.jsx
            └── KnowledgeBaseModal.jsx
```

---

## 🚀 Quick Start

### 1. Installation
Install root backend & test dependencies:
```bash
npm install
```

Install React frontend dependencies:
```bash
npm install --prefix frontend
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
SERVICE_CENTER_NAME="Precision Auto Care & Service Center"
```

### 3. Run the Application
You can run in production mode (Express serving compiled React app) or run the React Vite development server:

- **Option A: Run Express Server (serves React production build directly)**
  ```bash
  npm start
  ```
  Open [http://localhost:3000](http://localhost:3000).

- **Option B: Run React Vite Dev Server (with HMR & API proxy)**
  ```bash
  # Terminal 1: Backend
  npm start

  # Terminal 2: React Vite Dev Server
  npm run client
  ```
  Open [http://localhost:5173](http://localhost:5173).

---

## 📡 API Reference

### 1. Post Chat Message
- **Endpoint**: `POST /api/chat`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "message": "Hi, my 2019 Honda Accord has a battery clicking sound when I try to start it.",
  "sessionId": "optional-uuid-here"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "e2a34fc8-d45e-40fb-881b-91c6bfba7c21",
    "reply": "Clicking or no-crank issues frequently stem from a depleted 12V battery, loose terminal connections, or a failing alternator. What is your full name, please?",
    "safetyAlert": {
      "isEmergency": false,
      "level": "NONE",
      "advice": null
    },
    "customerProfile": {
      "name": null,
      "phone": null,
      "makeModel": "Honda Accord",
      "year": "2019",
      "complaint": "battery clicking sound when I try to start it",
      "mileage": null,
      "drivableStatus": "Not Drivable"
    },
    "intake": {
      "isComplete": false,
      "missingFields": ["name", "phone", "mileage"],
      "completedFields": ["makeModel", "year", "complaint", "drivableStatus"],
      "progressPercentage": 57
    },
    "diagnosticContext": {
      "category": "battery",
      "suggestedAction": "Battery Load Test & Alternator Diagnostic",
      "matchedKnowledge": [
        {
          "category": "Battery & Electrical Starting System",
          "issue": "rapid_clicking_no_crank",
          "safetyLevel": "MEDIUM",
          "recommendation": "Battery load test and terminal inspection, jump-start assistance if safe."
        }
      ]
    },
    "updatedAt": "2026-09-26T10:25:00.000Z"
  }
}
```

---

### 2. Get Session Details
- **Endpoint**: `GET /api/session/:sessionId`
- **Response**: Returns full message history and structured intake state.

---

### 3. Reset Session
- **Endpoint**: `POST /api/session/reset`
- **Request Body**:
```json
{
  "sessionId": "e2a34fc8-d45e-40fb-881b-91c6bfba7c21"
}
```

---

### 4. Search Knowledge Base
- **Endpoint**: `GET /api/knowledge-base?query=brakes`
- **Response**: Returns matching diagnostic topics, potential causes, safety levels, and recommended technician procedures.

---

### 5. Health Check
- **Endpoint**: `GET /api/health`
- **Response**:
```json
{
  "status": "online",
  "service": "Precision Auto Care & Service Center",
  "model": "gpt-4o-mini",
  "hasOpenAIKey": true,
  "timestamp": "2026-09-26T10:25:00.000Z"
}
```

---

## 🧪 Running Automated Tests

Run the built-in test suite to verify health checks, safety escalation, knowledge base search, and customer intake flow:
```bash
npm test
```

---

## 🛡️ Safety & Diagnostic Rules Matrix

| Issue Category | Key Symptoms | Risk Level | Emergency Action |
|---|---|---|---|
| **Engine** | Check Engine Light, Misfire, Stalling | HIGH | If CEL flashing or stalling in traffic, pull over. OBD-II scan required. |
| **Battery** | Rapid clicking, No crank, Alternator light | MEDIUM | Avoid touching leaking acid. Perform battery & charging load test. |
| **Overheating** | Steam from hood, Temp gauge pinned in RED | **CRITICAL** | **PULL OVER & SHUT OFF ENGINE IMMEDIATELY. NEVER open hot radiator cap.** Tow to shop. |
| **Brakes** | Pedal sinks to floor, Metal grinding | **CRITICAL** | **DO NOT DRIVE VEHICLE.** Flatbed tow for hydraulic line/pad inspection. |
| **Tyres** | Low PSI, Sidewall bulge, High speed vibration | HIGH | Sidewall damage is a blowout hazard. Minimum 2/32" tread depth. |
| **Transmission** | Slipping gears, Delayed engagement, Burnt smell | HIGH | Avoid highway trips if slipping. Check fluid condition & TCM codes. |
| **A/C Climate** | Blowing warm air, Moldy odor, Belt squeal | LOW-MED | UV dye leak check and certified refrigerant recovery. |
| **Unusual Noises** | Deep knocking, Wheel bearing drone, CV clicks | MED-CRIT | Deep bottom-end knock = immediate shutdown. Stethoscope inspection. |
