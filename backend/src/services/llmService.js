const { OpenAI } = require('openai');
const env = require('../config/env');
const { searchKnowledge, getRelevantContextString } = require('../knowledgeBase');

let openaiClient = null;
if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0) {
  try {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  } catch (err) {
    console.error('Failed to initialize OpenAI client:', err.message);
  }
}

/**
 * Safely parse JSON from LLM reply.
 */
function safeParseJson(rawText) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e2) {
        // ignore
      }
    }
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } catch (e3) {
        // ignore
      }
    }
    return null;
  }
}

/**
 * Local Intelligent Automotive Triage Simulator
 * Runs when OpenAI API key is unconfigured or in offline mode.
 */
function simulateAutomotiveTriage(userMessage, currentProfile = {}, conversationHistory = []) {
  const lowerMsg = userMessage.toLowerCase();
  const updatedInfo = { ...currentProfile };

  // --- Step 1: Customer Profile Heuristics ---

  // Name extraction
  const nameMatch = userMessage.match(/(?:my name is|i am|i'm|it's|this is|call me|name is|name:)\s+([A-Za-z\s'-]{2,30})/i);
  if (!updatedInfo.name) {
    if (nameMatch && nameMatch[1]) {
      let cleanName = nameMatch[1].trim();
      cleanName = cleanName.replace(/\s+(?:and|my|phone|number|with|driving|having|car|at|is).*$/i, '').trim();
      const words = cleanName.split(/\s+/).slice(0, 3);
      cleanName = words.join(' ');
      if (cleanName.length >= 2 && !/^(driving|having|not|yes|no|my)$/i.test(cleanName)) {
        updatedInfo.name = cleanName;
      }
    } else {
      // Check if last assistant message asked for name, or if user just sent their name (1-4 title-case words)
      const lastAssistantMsg = conversationHistory.slice().reverse().find(m => m.role === 'assistant');
      const askedForName = lastAssistantMsg && /name/i.test(lastAssistantMsg.content || '');
      const trimmed = userMessage.trim();
      const words = trimmed.split(/\s+/);
      if (askedForName && words.length >= 1 && words.length <= 4 && /^[A-Za-z\s'-]+$/.test(trimmed)) {
        if (!/^(yes|no|ok|okay|sure|hello|hi|hey|thanks|thank you|fine|not drivable|drivable)$/i.test(trimmed)) {
          updatedInfo.name = trimmed;
        }
      }
    }
  }

  // Phone extraction
  const phoneMatch = userMessage.match(/(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)?\d{3}[-.\s]*\d{4}|\b\d{10}\b/);
  if (!updatedInfo.phone) {
    if (phoneMatch) {
      updatedInfo.phone = phoneMatch[0].trim();
    } else {
      const lastAssistantMsg = conversationHistory.slice().reverse().find(m => m.role === 'assistant');
      const askedForPhone = lastAssistantMsg && /(?:phone|number|contact)/i.test(lastAssistantMsg.content || '');
      const digitsOnly = userMessage.replace(/\D/g, '');
      if (askedForPhone && digitsOnly.length >= 10 && digitsOnly.length <= 13) {
        updatedInfo.phone = userMessage.trim();
      }
    }
  }

  // Vehicle Model / Year extraction
  const makes = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Nissan', 'BMW', 'Mercedes', 'Mercedes-Benz',
    'Audi', 'Hyundai', 'Kia', 'Subaru', 'Volkswagen', 'VW', 'Mazda', 'Lexus', 'Jeep', 'Dodge',
    'Ram', 'GMC', 'Tesla', 'Volvo', 'Acura', 'Infiniti', 'Porsche', 'Chrysler', 'Cadillac',
    'Maruti', 'Suzuki', 'Tata', 'Mahindra', 'Skoda', 'Renault', 'MG', 'Fiat', 'Peugeot'
  ];
  const yearMatch = userMessage.match(/\b(19\d{2}|20[0-2]\d)\b/);
  const foundYear = yearMatch ? yearMatch[1] : '';

  for (const make of makes) {
    if (new RegExp(`\\b${make}\\b`, 'i').test(userMessage) && !updatedInfo.vehicleModel) {
      const makeRegex = new RegExp(`(?:${make})\\s+([A-Za-z0-9\\-]+(?:\\s+[A-Za-z0-9\\-]+)?)?`, 'i');
      const mmMatch = userMessage.match(makeRegex);
      const modelStr = mmMatch ? mmMatch[0].trim() : make;
      updatedInfo.vehicleModel = foundYear && !modelStr.includes(foundYear) ? `${foundYear} ${modelStr}` : modelStr;
      break;
    }
  }

  // Issue Start Time extraction (e.g. "started 2 days ago", "since yesterday", "started this morning", "past week", "about an hour ago")
  const timeMatch = userMessage.match(/(?:started|began|happening|since|for the past|about)\s+([A-Za-z0-9\s]{2,25}(?:ago|morning|yesterday|today|days|weeks|hours|miles|trip)?)/i)
    || userMessage.match(/\b(this morning|yesterday|today|last week|2 days ago|3 days ago|a few days ago|couple of days ago|last month)\b/i);

  if (timeMatch && !updatedInfo.issueStartTime) {
    const rawTime = timeMatch[1] ? timeMatch[1].trim() : timeMatch[0].trim();
    if (!rawTime.toLowerCase().includes('driving') && !rawTime.toLowerCase().includes('brake')) {
      updatedInfo.issueStartTime = rawTime;
    }
  }

  // Mileage extraction
  const mileageMatch = userMessage.match(/(?:mileage(?:\s+is)?[:\s]*)?(\b\d{1,3}(?:,\d{3})+\b|\b\d{1,3}\s?k\b|\b\d{2,6}\b)\s*(?:miles|mile|mi|kms|km|odometer)?/i);
  const hasMileageKeyword = /\b(miles|mile|mi|kms|km|odometer|mileage)\b/i.test(userMessage) || /\b\d{1,3}\s*k\b/i.test(userMessage);
  if (mileageMatch && !updatedInfo.mileage && hasMileageKeyword) {
    const rawVal = mileageMatch[1] ? mileageMatch[1].trim() : mileageMatch[0].trim();
    if (!phoneMatch || !phoneMatch[0].includes(rawVal)) {
      updatedInfo.mileage = mileageMatch[0].trim();
    }
  }

  // Drivable Status extraction
  if (lowerMsg.includes('not drivable') || lowerMsg.includes("can't drive") || lowerMsg.includes('cannot drive') || lowerMsg.includes('wont start') || lowerMsg.includes("won't start") || lowerMsg.includes('dead')) {
    updatedInfo.drivableStatus = 'Not Drivable';
  } else if (lowerMsg.includes('unsafe') || lowerMsg.includes('smoke') || lowerMsg.includes('fire') || lowerMsg.includes('no brakes') || lowerMsg.includes('pedal went to the floor') || lowerMsg.includes('overheating')) {
    updatedInfo.drivableStatus = 'Unsafe to Drive';
  } else if (lowerMsg.includes('drivable') || lowerMsg.includes('still drive') || lowerMsg.includes('can drive') || lowerMsg.includes('runs fine')) {
    updatedInfo.drivableStatus = 'Drivable';
  }

  // Complaint extraction
  if (!updatedInfo.complaint && (
    lowerMsg.includes('brake') || lowerMsg.includes('engine') || lowerMsg.includes('battery') ||
    lowerMsg.includes('smoke') || lowerMsg.includes('noise') || lowerMsg.includes('sound') ||
    lowerMsg.includes('leak') || lowerMsg.includes('ac') || lowerMsg.includes('air conditioning') ||
    lowerMsg.includes('tire') || lowerMsg.includes('tyre') || lowerMsg.includes('transmission') ||
    lowerMsg.includes('heat') || lowerMsg.includes('smell') || lowerMsg.includes('squeal')
  )) {
    updatedInfo.complaint = userMessage.length > 100 ? userMessage.substring(0, 97) + '...' : userMessage;
  }

  // --- Step 2: Critical Safety Checks ---
  const isSmokeOrFire = lowerMsg.includes('smoke') || lowerMsg.includes('fire') || lowerMsg.includes('flame') || lowerMsg.includes('burning smell');
  const isSevereBrakes = (lowerMsg.includes('brake') && (lowerMsg.includes('floor') || lowerMsg.includes('sink') || lowerMsg.includes('no stop') || lowerMsg.includes('failed') || lowerMsg.includes('sponge')));
  const isOverheatingSteam = lowerMsg.includes('steam') || (lowerMsg.includes('overheat') && (lowerMsg.includes('red') || lowerMsg.includes('hot')));
  const isOilWarning = lowerMsg.includes('oil pressure') || lowerMsg.includes('oil light');

  let safetyAlert = {
    isEmergency: false,
    level: 'NONE',
    advice: null
  };

  let responseMessage = '';
  let categoryIdentified = 'general';
  let suggestedServiceAction = 'Certified Multi-Point Diagnostic Inspection';

  if (isSmokeOrFire || isSevereBrakes || isOverheatingSteam || isOilWarning) {
    safetyAlert.isEmergency = true;
    safetyAlert.level = 'CRITICAL';
    updatedInfo.drivableStatus = 'Unsafe to Drive';

    if (isSmokeOrFire) {
      categoryIdentified = 'safety_escalation';
      safetyAlert.advice = 'PULL OVER SAFELY & TURN OFF ENGINE. Do not continue driving.';
      responseMessage = `Safety first: Please pull over to a safe area away from traffic immediately and turn off the engine. If there is visible smoke or flames, evacuate everyone to a safe distance and do not attempt to open the hood. We strongly advise arranging a flatbed tow to our service center.`;
    } else if (isSevereBrakes) {
      categoryIdentified = 'brakes';
      safetyAlert.advice = 'BRAKE HYDRAULIC FAILURE: Do not drive vehicle. Tow immediately.';
      responseMessage = `Your safety is our top priority: A brake pedal sinking to the floor indicates a critical hydraulic brake issue. Please do not drive the car. Safely bring it to a stop and let us arrange a tow for immediate on-site inspection.`;
    } else if (isOverheatingSteam) {
      categoryIdentified = 'overheating';
      safetyAlert.advice = 'SEVERE OVERHEATING: Pull over & NEVER open hot radiator cap.';
      responseMessage = `Please pull over safely and shut the engine off immediately to prevent catastrophic engine damage. Important warning: NEVER open the radiator cap while the engine is hot. Let's arrange a flatbed tow to our service facility.`;
    } else {
      categoryIdentified = 'engine';
      safetyAlert.advice = 'OIL PRESSURE LOSS: Shut down engine to protect against seizure.';
      responseMessage = `A red oil warning indicates critical loss of lubrication pressure. Please pull over safely and turn off the engine immediately.`;
    }
    suggestedServiceAction = 'Emergency Tow & Priority Safety Inspection';
  } else {
    // --- Step 3: Match Knowledge Base ---
    const kbResults = searchKnowledge(userMessage);
    let advisoryAdvice = '';

    if (kbResults.length > 0) {
      const topMatch = kbResults[0];
      categoryIdentified = topMatch.categoryId;

      if (categoryIdentified === 'brakes') {
        advisoryAdvice = `Brake noises or vibrations commonly indicate worn friction pads or rotor wear, though an on-site physical inspection is required to confirm pad thickness.`;
        suggestedServiceAction = 'Brake Pad & Rotor Diagnostic Inspection';
      } else if (categoryIdentified === 'battery') {
        advisoryAdvice = `Clicking or no-crank issues frequently stem from a depleted 12V battery, loose terminal connections, or a failing alternator. A digital battery and charging system test will pinpoint the exact cause.`;
        suggestedServiceAction = 'Battery Load Test & Alternator Diagnostic';
      } else if (categoryIdentified === 'engine') {
        advisoryAdvice = `Check Engine lights or rough idling can be caused by spark plugs, ignition coils, or sensor anomalies. Our certified technicians can run an OBD-II diagnostic scan.`;
        suggestedServiceAction = 'OBD-II Diagnostic Scan & Ignition System Check';
      } else if (categoryIdentified === 'overheating') {
        advisoryAdvice = `Rising temperatures may relate to low coolant, a sticking thermostat, or a radiator fan issue. Keep an eye on the gauge and do not let it reach the red zone.`;
        suggestedServiceAction = 'Cooling System Pressure Test & Thermostat Check';
      } else if (categoryIdentified === 'tyres') {
        advisoryAdvice = `Tyre pressure loss or vibrations could point to a tread puncture, wheel imbalance, or wheel alignment need.`;
        suggestedServiceAction = 'Tyre Puncture Repair & 4-Wheel Alignment';
      } else if (categoryIdentified === 'transmission') {
        advisoryAdvice = `Delayed shifting or slipping gears are often associated with low transmission fluid or solenoid wear. We recommend a fluid condition check and TCM scan.`;
        suggestedServiceAction = 'Transmission Fluid & TCM Diagnostic Scan';
      } else if (categoryIdentified === 'ac') {
        advisoryAdvice = `Warm air from your A/C often suggests low refrigerant pressure or a compressor clutch issue. An A/C performance test and UV leak check will diagnose it.`;
        suggestedServiceAction = 'A/C Performance Evaluation & Recharge';
      } else if (categoryIdentified === 'noises') {
        advisoryAdvice = `Unusual noises provide valuable early clues—whether wheel bearings, suspension links, or drive belts. Our certified mechanics can inspect it on a lift.`;
        suggestedServiceAction = 'Acoustic & Suspension Multi-Point Inspection';
      }
    }

    // --- Step 4: Determine next question in intake sequence ---
    const requiredOrder = [
      { key: 'name', question: 'May I have your full name, please?' },
      { key: 'phone', question: 'What is the best phone number to reach you for service updates?' },
      { key: 'vehicleModel', question: 'What is the make, model, and year of your vehicle (e.g., 2019 Toyota Camry)?' },
      { key: 'issueStartTime', question: 'Approximately when did you first notice this issue starting (e.g. today, 2 days ago)?' },
      { key: 'complaint', question: 'Could you describe the main symptoms you are experiencing with the vehicle?' },
      { key: 'mileage', question: 'Approximately what is the current mileage on the odometer?' },
      { key: 'drivableStatus', question: 'Is the car currently drivable, or should we arrange roadside assistance/towing?' }
    ];

    const nextMissing = requiredOrder.find(item => !updatedInfo[item.key] || updatedInfo[item.key] === 'Unknown');

    if (!advisoryAdvice && conversationHistory.length === 0) {
      advisoryAdvice = `Hello! Welcome to ${env.SERVICE_CENTER_NAME}. I'm Alex, your automated service advisor. I'm here to assess your vehicle concern and get you booked with our certified technicians.`;
    }

    if (nextMissing) {
      if (advisoryAdvice) {
        responseMessage = `${advisoryAdvice} ${nextMissing.question}`;
      } else {
        responseMessage = `Thank you. ${nextMissing.question}`;
      }
    } else {
      // Intake Complete
      responseMessage = `Thank you, ${updatedInfo.name || 'valued customer'}. I have logged your ${updatedInfo.vehicleModel || 'vehicle'} regarding "${updatedInfo.complaint || 'the reported issue'}" (which started around ${updatedInfo.issueStartTime || 'recently'}). We have your contact as ${updatedInfo.phone || 'on file'} with approx ${updatedInfo.mileage || 'recorded'} miles. Our team at ${env.SERVICE_CENTER_NAME} is ready for your certified inspection. Would you prefer a morning or afternoon appointment?`;
    }
  }

  const requiredKeys = ['name', 'phone', 'vehicleModel', 'issueStartTime', 'complaint', 'mileage', 'drivableStatus'];
  const missingFields = requiredKeys.filter(f => !updatedInfo[f] || updatedInfo[f] === 'Unknown');
  const intakeComplete = missingFields.length === 0;

  return {
    message: responseMessage,
    safetyAlert,
    customerInfo: updatedInfo,
    missingFields,
    intakeComplete,
    categoryIdentified,
    suggestedServiceAction
  };
}

/**
 * Execute chat inference with OpenAI or local automotive fallback.
 */
async function processChatWithLLM(userMessage, currentCustomerState = {}, conversationHistory = []) {
  const knowledgeContext = getRelevantContextString(userMessage);

  if (!openaiClient) {
    return simulateAutomotiveTriage(userMessage, currentCustomerState, conversationHistory);
  }

  try {
    const { buildSystemPrompt } = require('../prompts/systemPrompt');
    const systemPrompt = buildSystemPrompt(currentCustomerState, knowledgeContext);

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of conversationHistory.slice(-10)) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const completion = await openaiClient.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 600
    });

    const rawReply = completion.choices[0]?.message?.content;
    const parsed = safeParseJson(rawReply);

    if (parsed && parsed.message) {
      const mergedCustomerInfo = { ...(currentCustomerState || {}) };
      if (parsed.customerInfo && typeof parsed.customerInfo === 'object') {
        for (const [k, v] of Object.entries(parsed.customerInfo)) {
          if (v !== null && v !== undefined && v !== '' && v !== 'Unknown' && v !== 'null') {
            mergedCustomerInfo[k] = v;
          }
        }
      }

      return {
        message: parsed.message,
        safetyAlert: parsed.safetyAlert || { isEmergency: false, level: 'NONE', advice: null },
        customerInfo: mergedCustomerInfo,
        missingFields: parsed.missingFields || [],
        intakeComplete: Boolean(parsed.intakeComplete),
        categoryIdentified: parsed.categoryIdentified || 'general',
        suggestedServiceAction: parsed.suggestedServiceAction || 'Certified Multi-Point Inspection'
      };
    }

    return simulateAutomotiveTriage(userMessage, currentCustomerState, conversationHistory);
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    return simulateAutomotiveTriage(userMessage, currentCustomerState, conversationHistory);
  }
}

module.exports = {
  processChatWithLLM,
  simulateAutomotiveTriage
};
