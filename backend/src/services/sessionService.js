const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

const REQUIRED_FIELDS = [
  'name',
  'phone',
  'vehicleModel',
  'issueStartTime',
  'complaint',
  'mileage',
  'drivableStatus'
];

class SessionService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Initializes a default clean session structure.
   */
  createNewSessionState(sessionId = null) {
    const id = sessionId || uuidv4();
    const session = {
      sessionId: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerInfo: {
        name: null,
        phone: null,
        email: null,
        vehicleModel: null,
        vehicleMake: null,
        vehicleYear: null,
        registrationVin: null,
        issueStartTime: null,
        complaint: null,
        mileage: null,
        drivableStatus: 'Unknown'
      },
      missingFields: [...REQUIRED_FIELDS],
      intakeComplete: false,
      safetyStatus: {
        isEmergency: false,
        level: 'NONE',
        alertCount: 0,
        lastAlert: null
      },
      categoryIdentified: 'general',
      suggestedServiceAction: null,
      messages: []
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Retrieve existing session or create a new one.
   */
  getOrCreateSession(sessionId) {
    if (!sessionId) {
      return this.createNewSessionState();
    }
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createNewSessionState(sessionId);
    }
    return session;
  }

  /**
   * Get session by ID.
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Add a message to session history.
   */
  addMessage(sessionId, role, content, extra = {}) {
    const session = this.getOrCreateSession(sessionId);
    const messageObj = {
      id: uuidv4(),
      role, // 'user' | 'assistant' | 'system'
      content,
      timestamp: new Date().toISOString(),
      ...extra
    };

    session.messages.push(messageObj);

    // Keep history within configured max length
    if (session.messages.length > env.MAX_HISTORY_LENGTH * 2) {
      session.messages = session.messages.slice(-env.MAX_HISTORY_LENGTH * 2);
    }

    session.updatedAt = new Date().toISOString();
    return messageObj;
  }

  /**
   * Update session customer profile and diagnostic state.
   */
  updateSessionState(sessionId, updates = {}) {
    const session = this.getOrCreateSession(sessionId);

    if (updates.customerInfo) {
      const aliasMap = {
        fullName: 'name',
        full_name: 'name',
        customerName: 'name',
        customer_name: 'name',
        phoneNumber: 'phone',
        phone_number: 'phone',
        mobile: 'phone',
        contact: 'phone',
        emailAddress: 'email',
        email_address: 'email',
        vehicle_model: 'vehicleModel',
        vehicle_make: 'vehicleMake',
        vehicle_year: 'vehicleYear',
        registration_vin: 'registrationVin',
        issue_start_time: 'issueStartTime',
        timeline: 'issueStartTime',
        started: 'issueStartTime',
        problem: 'complaint',
        issue: 'complaint',
        drivable_status: 'drivableStatus'
      };

      for (const [rawKey, val] of Object.entries(updates.customerInfo)) {
        const key = aliasMap[rawKey] || rawKey;
        if (val !== null && val !== undefined && val !== '' && val !== 'Unknown' && val !== 'null') {
          session.customerInfo[key] = val;
        }
      }
    }

    // Recompute missing fields
    session.missingFields = REQUIRED_FIELDS.filter(f => {
      const v = session.customerInfo[f];
      return !v || v === 'Unknown' || v === 'null';
    });

    session.intakeComplete = session.missingFields.length === 0;

    if (updates.safetyAlert && updates.safetyAlert.isEmergency) {
      session.safetyStatus.isEmergency = true;
      session.safetyStatus.level = updates.safetyAlert.level || 'CRITICAL';
      session.safetyStatus.lastAlert = updates.safetyAlert.advice;
      session.safetyStatus.alertCount += 1;
    }

    if (updates.categoryIdentified) {
      session.categoryIdentified = updates.categoryIdentified;
    }

    if (updates.suggestedServiceAction) {
      session.suggestedServiceAction = updates.suggestedServiceAction;
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Reset a session.
   */
  resetSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }
    return this.createNewSessionState(sessionId);
  }

  /**
   * Get all active sessions.
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

module.exports = new SessionService();
