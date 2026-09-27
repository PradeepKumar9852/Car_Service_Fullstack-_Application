const assert = require('assert');
const http = require('http');
const app = require('../src/app');

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  console.log('🧪 Starting Backend Test Suite...\n');

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`📡 Test server running on port ${port}`);
      resolve();
    });
  });

  try {
    // Test 1: Health Check
    console.log('▶ Test 1: GET /api/health');
    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'online');
    console.log('  ✔ Health check passed!\n');

    // Test 1b: Chat Info Endpoint (GET /api/chat)
    console.log('▶ Test 1b: GET /api/chat (Endpoint Information)');
    const chatInfo = await request('/api/chat');
    assert.strictEqual(chatInfo.status, 200);
    assert.strictEqual(chatInfo.data.status, 'online');
    assert.strictEqual(chatInfo.data.method, 'POST');
    console.log('  ✔ GET /api/chat info endpoint passed!\n');

    // Test 2: Knowledge Base
    console.log('▶ Test 2: GET /api/knowledge-base & Search');
    const kbAll = await request('/api/knowledge-base');
    assert.strictEqual(kbAll.status, 200);
    assert(kbAll.data.data.brakes, 'Knowledge base should contain brakes category');
    assert(kbAll.data.data.engine, 'Knowledge base should contain engine category');

    const kbSearch = await request('/api/knowledge-base?query=overheating');
    assert.strictEqual(kbSearch.status, 200);
    assert(kbSearch.data.count > 0, 'Should find overheating topics');
    console.log('  ✔ Knowledge base endpoints passed!\n');

    // Test 3: Chat - Safety Emergency Trigger (Smoke)
    console.log('▶ Test 3: POST /api/chat - Safety Escalation Trigger (Smoke)');
    const safetyChat = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Help, I see thick white smoke coming from under my hood and the engine is very hot!'
      })
    });
    assert.strictEqual(safetyChat.status, 200);
    assert.strictEqual(safetyChat.data.data.safetyAlert.isEmergency, true, 'Emergency flag must be true');
    assert.strictEqual(safetyChat.data.data.customerProfile.drivableStatus, 'Unsafe to Drive');
    assert(safetyChat.data.data.reply.toLowerCase().includes('pull over'), 'Must instruct driver to pull over');
    console.log('  ✔ Critical safety escalation passed! (Instructed pull over and tow)\n');

    // Test 4: Step-by-Step Customer Intake Flow with issueStartTime
    console.log('▶ Test 4: POST /api/chat - Step-by-Step Intake Flow');
    let sessionId;

    // Step 4.1: Initial complaint & issue start time
    const step1 = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hi, my car is making a loud squealing noise when I press the brakes. It started yesterday morning.'
      })
    });
    assert.strictEqual(step1.status, 200);
    sessionId = step1.data.data.sessionId;
    assert(sessionId, 'Should return a valid sessionId');
    assert.strictEqual(step1.data.data.intake.isComplete, false);
    console.log('  ✔ Step 4.1 Complaint & issue time registered, assigned Session ID');

    // Step 4.2: Name and phone
    const step2 = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        message: 'My name is Robert Davis and my phone is 555-987-6543'
      })
    });
    assert.strictEqual(step2.data.data.customerProfile.name, 'Robert Davis');
    assert.strictEqual(step2.data.data.customerProfile.phone, '555-987-6543');
    console.log('  ✔ Step 4.2 Customer Name and Phone extracted');

    // Step 4.3: Vehicle Model, Mileage, Drivable
    const step3 = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        message: 'It is a 2018 Toyota Camry with 65000 miles, and it is still drivable.'
      })
    });
    assert.strictEqual(step3.data.data.customerProfile.drivableStatus, 'Drivable');
    assert(step3.data.data.customerProfile.vehicleModel.toLowerCase().includes('toyota'));
    assert.strictEqual(step3.data.data.intake.isComplete, true, 'Intake should now be complete');
    console.log('  ✔ Step 4.3 Vehicle Model, Mileage, Drivability complete! (Intake complete: true)\n');

    // Test 5: Verify Session Retrieval
    console.log('▶ Test 5: GET /api/session/:sessionId');
    const sessionRes = await request(`/api/session/${sessionId}`);
    assert.strictEqual(sessionRes.status, 200);
    assert.strictEqual(sessionRes.data.data.customerInfo.name, 'Robert Davis');
    assert.strictEqual(sessionRes.data.data.intakeComplete, true);
    console.log('  ✔ Session persistence verified!\n');

    // Test 6: Reset Session
    console.log('▶ Test 6: POST /api/session/reset');
    const resetRes = await request('/api/session/reset', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.data.intakeComplete, false);
    console.log('  ✔ Session reset verified!\n');

    // Test 7: Direct Assessment Form Submission
    console.log('▶ Test 7: POST /api/assessment/submit');
    const submitRes = await request('/api/assessment/submit', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Emily Johnson',
        phone: '555-432-1098',
        email: 'emily.johnson@example.com',
        vehicleModel: '2021 Honda Civic',
        mileage: '32000',
        complaint: 'AC blowing warm air on driver side',
        drivableStatus: 'Drivable',
        intakeComplete: true
      })
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.success, true);
    assert(submitRes.data.message.includes('recorded') || submitRes.data.message.includes('success'));
    console.log('  ✔ Customer assessment form submission route passed!\n');

    // Test 8: Assessment Submission Validation (empty payload)
    console.log('▶ Test 8: POST /api/assessment/submit - Validation Error on Empty Payload');
    const invalidSubmit = await request('/api/assessment/submit', {
      method: 'POST',
      body: JSON.stringify({})
    });
    assert.strictEqual(invalidSubmit.status, 400);
    assert.strictEqual(invalidSubmit.data.success, false);
    // Test 9: Chat with direct customer profile fields in request body
    console.log('▶ Test 9: POST /api/chat - Top-level Customer Profile in Request Body');
    const directPayloadChat = await request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: "My car won't start and makes a clicking sound.",
        name: 'Amit Kumar',
        phone: '9876543210',
        complaint: 'Engine does not start and makes a clicking sound',
        vehicleModel: 'Hyundai i20'
      })
    });
    assert.strictEqual(directPayloadChat.status, 200);
    assert.strictEqual(directPayloadChat.data.success, true);
    const profile = directPayloadChat.data.data.customerProfile;
    assert.strictEqual(profile.name, 'Amit Kumar', 'Profile name should be Amit Kumar');
    assert.strictEqual(profile.phone, '9876543210', 'Profile phone should be 9876543210');
    assert.strictEqual(profile.vehicleModel, 'Hyundai i20', 'Profile vehicleModel should be Hyundai i20');
    assert.strictEqual(profile.complaint, 'Engine does not start and makes a clicking sound', 'Profile complaint should match');
    // Assistant should NOT ask for name, because name is already provided
    assert(!directPayloadChat.data.data.reply.includes('full name'), 'Assistant should not ask for full name when already provided');
    console.log('  ✔ Top-level customer profile fields successfully captured and retained!\n');

    console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY! 🚗✨\n');
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
