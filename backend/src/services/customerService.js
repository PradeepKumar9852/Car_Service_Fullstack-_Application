const db = require('../config/db');

/**
 * Parses vehicle model string into components (year, make, model).
 * e.g. "2018 Toyota Camry" -> { year: "2018", make: "Toyota", model: "Camry" }
 */
function parseVehicleDetails(vehicleModelStr = '') {
  if (!vehicleModelStr) return { year: null, make: null, model: null };

  const str = String(vehicleModelStr).trim();
  const yearMatch = str.match(/\b(19\d{2}|20[0-2]\d)\b/);
  const year = yearMatch ? yearMatch[1] : null;

  const makes = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Nissan', 'BMW', 'Mercedes', 'Mercedes-Benz',
    'Audi', 'Hyundai', 'Kia', 'Subaru', 'Volkswagen', 'VW', 'Mazda', 'Lexus', 'Jeep', 'Dodge',
    'Ram', 'GMC', 'Tesla', 'Volvo', 'Acura', 'Infiniti', 'Porsche', 'Chrysler', 'Cadillac',
    'Maruti', 'Suzuki', 'Tata', 'Mahindra', 'Skoda', 'Renault', 'MG', 'Fiat', 'Peugeot'
  ];

  let make = null;
  for (const m of makes) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(str)) {
      make = m;
      break;
    }
  }

  let model = str;
  if (year) model = model.replace(year, '').trim();
  if (make) model = model.replace(new RegExp(`\\b${make}\\b`, 'i'), '').trim();
  model = model.replace(/^[-,\s]+|[-,\s]+$/g, '');

  return {
    year: year || null,
    make: make || null,
    model: model || str
  };
}

class CustomerService {
  /**
   * Securely saves or updates a customer profile in PostgreSQL using parameterized queries.
   * 
   * @param {Object} profile - Customer details
   * @param {string} [profile.name] - Full name
   * @param {string} [profile.phone] - Phone number
   * @param {string} [profile.email] - Email address
   * @param {string} [profile.vehicleModel] - Vehicle model / make / year
   * @param {string} [profile.registrationVin] - VIN or plate
   * @param {string} [profile.mileage] - Mileage
   * @param {string} [profile.issueStartTime] - Issue start timeline
   * @param {string} [profile.complaint] - Primary complaint description
   * @param {string} [profile.drivableStatus] - Drivable status
   * @param {boolean} [profile.intakeComplete] - Whether all required fields are collected
   * @param {number} [existingCustomerId] - Optional existing customer ID to update
   * @returns {Promise<Object|null>} Saved customer record
   */
  async saveCustomerProfile(profile = {}, existingCustomerId = null) {
    try {
      const fullName = profile.name || profile.full_name || null;
      const phone = profile.phone || null;
      const email = profile.email || null;
      const registrationVin = profile.registrationVin || profile.registration_vin || null;
      const mileage = profile.mileage || null;
      const issueStartTime = profile.issueStartTime || profile.issue_start_time || null;
      const complaint = profile.complaint || null;
      const drivableStatus = profile.drivableStatus || profile.drivable_status || 'Unknown';
      const intakeComplete = Boolean(profile.intakeComplete || profile.intake_complete);

      const rawVehicle = profile.vehicleModel || profile.vehicle_model || '';
      const parsed = parseVehicleDetails(rawVehicle);
      const vehicleMake = profile.vehicleMake || profile.vehicle_make || parsed.make;
      const vehicleModel = profile.vehicleModelOnly || parsed.model || rawVehicle || null;
      const vehicleYear = profile.vehicleYear || profile.vehicle_year || parsed.year;

      // If existing customer ID is provided, perform parameterized UPDATE
      if (existingCustomerId) {
        const updateQuery = `
          UPDATE customers SET
            full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            email = COALESCE($3, email),
            vehicle_make = COALESCE($4, vehicle_make),
            vehicle_model = COALESCE($5, vehicle_model),
            vehicle_year = COALESCE($6, vehicle_year),
            registration_vin = COALESCE($7, registration_vin),
            mileage = COALESCE($8, mileage),
            issue_start_time = COALESCE($9, issue_start_time),
            complaint = COALESCE($10, complaint),
            drivable_status = COALESCE($11, drivable_status),
            intake_complete = COALESCE($12, intake_complete),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $13
          RETURNING *;
        `;

        const updateParams = [
          fullName,
          phone,
          email,
          vehicleMake,
          vehicleModel,
          vehicleYear,
          registrationVin,
          mileage,
          issueStartTime,
          complaint,
          drivableStatus,
          intakeComplete,
          existingCustomerId
        ];

        const { rows } = await db.query(updateQuery, updateParams);
        return rows[0] || null;
      }

      // Check if customer already exists by phone (if phone provided) to prevent duplicates
      if (phone) {
        const existingRes = await db.query('SELECT id FROM customers WHERE phone = $1 LIMIT 1', [phone]);
        if (existingRes.rows.length > 0) {
          return await this.saveCustomerProfile(profile, existingRes.rows[0].id);
        }
      }

      // Parameterized INSERT query
      const insertQuery = `
        INSERT INTO customers (
          full_name,
          phone,
          email,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          registration_vin,
          mileage,
          issue_start_time,
          complaint,
          drivable_status,
          intake_complete
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING *;
      `;

      const insertParams = [
        fullName,
        phone,
        email,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        registrationVin,
        mileage,
        issueStartTime,
        complaint,
        drivableStatus,
        intakeComplete
      ];

      const { rows } = await db.query(insertQuery, insertParams);
      return rows[0] || null;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CustomerService saveCustomerProfile note (DB offline or unconfigured):', err.message);
      }
      // If DB is offline, return null without failing the calling request
      return null;
    }
  }

  /**
   * Securely saves a conversation turn to the database linked to session and customer.
   * 
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {number|null} [params.customerId]
   * @param {string} params.role - 'user' | 'assistant'
   * @param {string} params.message
   * @param {Object|null} [params.safetyAlert]
   * @param {Object|null} [params.diagnosticContext]
   * @returns {Promise<Object|null>}
   */
  async saveConversation({ sessionId, customerId = null, role, message, safetyAlert = null, diagnosticContext = null }) {
    try {
      const insertQuery = `
        INSERT INTO conversations (
          customer_id,
          session_id,
          role,
          message,
          safety_alert,
          diagnostic_context
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        RETURNING *;
      `;

      const params = [
        customerId,
        sessionId,
        role,
        message,
        safetyAlert ? JSON.stringify(safetyAlert) : null,
        diagnosticContext ? JSON.stringify(diagnosticContext) : null
      ];

      const { rows } = await db.query(insertQuery, params);
      return rows[0] || null;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CustomerService saveConversation note:', err.message);
      }
      return null;
    }
  }

  /**
   * Fetch customer by ID.
   */
  async getCustomerById(id) {
    try {
      const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
      return rows[0] || null;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CustomerService getCustomerById note:', err.message);
      }
      return null;
    }
  }

  /**
   * Fetch conversation history for a session from database.
   */
  async getConversationsBySession(sessionId) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM conversations WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      return rows;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CustomerService getConversationsBySession note:', err.message);
      }
      return [];
    }
  }
}

module.exports = new CustomerService();
