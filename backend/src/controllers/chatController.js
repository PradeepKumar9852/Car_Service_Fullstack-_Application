const chatService = require('../services/chatService');
const sessionService = require('../services/sessionService');
const { KNOWLEDGE_STORE, searchKnowledge } = require('../knowledgeBase');
const customerService = require('../services/customerService');
const env = require('../config/env');

/**
 * Helper to extract and normalize customer profile fields from flexible request structures.
 * Supports direct top-level fields, snake_case/camelCase variants, and nested objects
 * (overrideProfile, customerProfile, customerInfo, customer, profile, data).
 */
function extractCustomerProfile(body = {}) {
  if (!body || typeof body !== 'object') return {};

  const nested = body.overrideProfile || body.customerProfile || body.customerInfo || body.customer || body.profile || body.data || {};
  const source = { ...body, ...nested };

  const profile = {};

  const name = source.name || source.fullName || source.full_name || source.customerName || source.customer_name;
  if (name && typeof name === 'string' && name.trim()) {
    profile.name = name.trim();
  }

  const phone = source.phone || source.phoneNumber || source.phone_number || source.contact || source.mobile;
  if (phone && (typeof phone === 'string' || typeof phone === 'number')) {
    profile.phone = String(phone).trim();
  }

  const email = source.email || source.emailAddress || source.email_address;
  if (email && typeof email === 'string' && email.trim()) {
    profile.email = email.trim();
  }

  const vehicleModel = source.vehicleModel || source.vehicle_model || source.vehicle || source.car || source.makeModel || source.make_model || source.model;
  if (vehicleModel && typeof vehicleModel === 'string' && vehicleModel.trim()) {
    profile.vehicleModel = vehicleModel.trim();
  }

  const vehicleMake = source.vehicleMake || source.vehicle_make || source.make;
  if (vehicleMake && typeof vehicleMake === 'string' && vehicleMake.trim()) {
    profile.vehicleMake = vehicleMake.trim();
  }

  const vehicleYear = source.vehicleYear || source.vehicle_year || source.year;
  if (vehicleYear) {
    profile.vehicleYear = String(vehicleYear).trim();
  }

  const registrationVin = source.registrationVin || source.registration_vin || source.vin || source.plate || source.licensePlate || source.license_plate;
  if (registrationVin && typeof registrationVin === 'string' && registrationVin.trim()) {
    profile.registrationVin = registrationVin.trim();
  }

  const mileage = source.mileage || source.odometer;
  if (mileage) {
    profile.mileage = String(mileage).trim();
  }

  const issueStartTime = source.issueStartTime || source.issue_start_time || source.timeline || source.started;
  if (issueStartTime && typeof issueStartTime === 'string' && issueStartTime.trim()) {
    profile.issueStartTime = issueStartTime.trim();
  }

  const complaint = source.complaint || source.issue || source.problem || source.symptoms || source.description;
  if (complaint && typeof complaint === 'string' && complaint.trim()) {
    profile.complaint = complaint.trim();
  }

  const drivableStatus = source.drivableStatus || source.drivable_status || source.drivable;
  if (drivableStatus && typeof drivableStatus === 'string' && drivableStatus.trim() && drivableStatus !== 'Unknown') {
    profile.drivableStatus = drivableStatus.trim();
  }

  if (source.intakeComplete !== undefined) {
    profile.intakeComplete = Boolean(source.intakeComplete);
  } else if (source.intake_complete !== undefined) {
    profile.intakeComplete = Boolean(source.intake_complete);
  }

  return profile;
}

/**
 * GET info handler for /api/chat endpoint.
 * Informs browsers/clients that /api/chat is active and requires a POST request.
 */
function getChatInfo(req, res) {
  return res.status(200).json({
    status: 'online',
    service: env.SERVICE_CENTER_NAME,
    message: 'The /api/chat endpoint is active and ready to receive POST requests.',
    method: 'POST',
    contentType: 'application/json',
    expectedBody: {
      message: 'string (required) - Customer message or voice transcription',
      sessionId: 'string (optional) - Existing session ID to continue conversation',
      customerProfile: 'object (optional) - Customer assessment details (name, phone, vehicleModel, complaint, etc.)'
    },
    sampleCurl: `curl -X POST http://localhost:${env.PORT}/api/chat -H "Content-Type: application/json" -d "{\\"message\\": \\"My car brakes are squeaking\\"}"`,
    webInterface: 'http://localhost:5173'
  });
}

/**
 * Handle incoming chat / voice-text message.
 * POST /api/chat
 */
async function postChat(req, res) {
  try {
    const rawMessage = req.body?.message || req.body?.userMessage || req.body?.text || req.body?.prompt;
    const sessionId = req.body?.sessionId;
    const extractedProfile = extractCustomerProfile(req.body);
    const overrideProfile = Object.keys(extractedProfile).length > 0 ? extractedProfile : undefined;

    if (!rawMessage || typeof rawMessage !== 'string' || rawMessage.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Field "message" is required and must be a non-empty string.'
      });
    }

    const message = rawMessage.trim();

    const result = await chatService.handleIncomingMessage({
      message,
      sessionId,
      overrideProfile
    });

    return res.status(200).json({
      success: true,
      response: result.reply,
      data: result
    });
  } catch (error) {
    console.error('Error in postChat controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error while processing message.'
    });
  }
}

/**
 * Retrieve current state of a session.
 * GET /api/session/:sessionId
 */
function getSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session with ID "${sessionId}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error in getSession controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error retrieving session.'
    });
  }
}

/**
 * Reset a session to start fresh.
 * POST /api/session/reset
 */
function resetSession(req, res) {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    const newSession = sessionService.resetSession(sessionId);

    return res.status(200).json({
      success: true,
      message: 'Session successfully reset.',
      data: newSession
    });
  } catch (error) {
    console.error('Error in resetSession controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error resetting session.'
    });
  }
}

/**
 * Get knowledge base content or search topics.
 * GET /api/knowledge-base?query=brakes
 */
function getKnowledgeBase(req, res) {
  try {
    const { query } = req.query;
    if (query) {
      const results = searchKnowledge(query);
      return res.status(200).json({
        success: true,
        query,
        count: results.length,
        data: results
      });
    }

    return res.status(200).json({
      success: true,
      data: KNOWLEDGE_STORE
    });
  } catch (error) {
    console.error('Error in getKnowledgeBase controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error fetching knowledge base.'
    });
  }
}

/**
 * Submit customer assessment / intake form directly.
 * POST /api/assessment/submit or POST /api/customer
 */
async function submitAssessment(req, res) {
  try {
    const rawBody = req.body || {};
    const profile = extractCustomerProfile(rawBody);

    const sessionId = rawBody.sessionId || profile.sessionId || null;
    const customerId = rawBody.customerId || profile.customerId || null;

    // Minimum validation: at least one meaningful customer field must be present
    if (!profile.name && !profile.phone && !profile.complaint && !profile.vehicleModel && !profile.email) {
      return res.status(400).json({
        success: false,
        error: 'At least one customer field (name, phone, complaint, vehicleModel, or email) must be provided.',
        expectedFormat: {
          name: "Customer Full Name",
          phone: "Phone Number",
          email: "Email Address (optional)",
          vehicleModel: "e.g. 2019 Toyota Camry",
          mileage: "e.g. 65000",
          complaint: "Primary vehicle symptom/issue",
          issueStartTime: "When issue started",
          drivableStatus: "Drivable / Unsafe to Drive"
        }
      });
    }

    const savedRecord = await customerService.saveCustomerProfile({
      name: profile.name || null,
      phone: profile.phone || null,
      email: profile.email || null,
      vehicleModel: profile.vehicleModel || null,
      vehicleMake: profile.vehicleMake || null,
      vehicleYear: profile.vehicleYear || null,
      registrationVin: profile.registrationVin || null,
      mileage: profile.mileage || null,
      issueStartTime: profile.issueStartTime || null,
      complaint: profile.complaint || null,
      drivableStatus: profile.drivableStatus || 'Unknown',
      intakeComplete: profile.intakeComplete !== undefined ? profile.intakeComplete : true
    }, customerId);

    // If a session exists, link it
    if (sessionId && savedRecord) {
      const session = sessionService.getSession(sessionId);
      if (session) {
        session.customerId = savedRecord.id;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Customer assessment successfully recorded in database.',
      response: 'Customer assessment successfully recorded in database.',
      data: savedRecord || {
        name: profile.name || null,
        phone: profile.phone || null,
        email: profile.email || null,
        vehicleModel: profile.vehicleModel || null,
        mileage: profile.mileage || null,
        complaint: profile.complaint || null,
        drivableStatus: profile.drivableStatus || 'Unknown',
        intakeComplete: profile.intakeComplete !== undefined ? profile.intakeComplete : true,
        status: 'received_in_memory'
      }
    });
  } catch (error) {
    console.error('Error in submitAssessment controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error saving customer assessment.'
    });
  }
}

/**
 * Health check & runtime status.
 * GET /api/health
 */
function healthCheck(req, res) {
  return res.status(200).json({
    status: 'online',
    service: env.SERVICE_CENTER_NAME,
    port: env.PORT,
    model: env.OPENAI_API_KEY ? env.OPENAI_MODEL : 'Built-in Intelligent Automotive Engine (Fallback/Offline mode)',
    hasOpenAIKey: Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0),
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  postChat,
  getChatInfo,
  submitAssessment,
  getSession,
  resetSession,
  getKnowledgeBase,
  healthCheck
};
