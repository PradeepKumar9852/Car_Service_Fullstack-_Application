const sessionService = require('./sessionService');
const { processChatWithLLM } = require('./llmService');
const { searchKnowledge } = require('../knowledgeBase');
const customerService = require('./customerService');

class ChatService {
  /**
   * Processes incoming chat/voice message.
   * 
   * @param {Object} params
   * @param {string} params.message
   * @param {string} [params.sessionId]
   * @param {Object} [params.overrideProfile]
   * @returns {Promise<Object>}
   */
  async handleIncomingMessage({ message, sessionId, overrideProfile }) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new Error('Message is required and must be a non-empty string.');
    }

    const cleanMessage = message.trim();
    const session = sessionService.getOrCreateSession(sessionId);

    if (overrideProfile && typeof overrideProfile === 'object') {
      sessionService.updateSessionState(session.sessionId, { customerInfo: overrideProfile });
    }

    sessionService.addMessage(session.sessionId, 'user', cleanMessage);

    const llmResult = await processChatWithLLM(
      cleanMessage,
      session.customerInfo,
      session.messages
    );

    const updatedSession = sessionService.updateSessionState(session.sessionId, {
      customerInfo: llmResult.customerInfo,
      safetyAlert: llmResult.safetyAlert,
      categoryIdentified: llmResult.categoryIdentified,
      suggestedServiceAction: llmResult.suggestedServiceAction
    });

    sessionService.addMessage(session.sessionId, 'assistant', llmResult.message, {
      safetyAlert: llmResult.safetyAlert,
      categoryIdentified: llmResult.categoryIdentified
    });

    // Securely persist to PostgreSQL database using parameterized queries
    let savedCustomer = null;
    try {
      const customerInfo = updatedSession.customerInfo;
      const hasAnyCustomerDetails = Boolean(
        customerInfo.name || customerInfo.phone || customerInfo.vehicleModel || customerInfo.complaint
      );

      if (hasAnyCustomerDetails) {
        savedCustomer = await customerService.saveCustomerProfile({
          ...customerInfo,
          intakeComplete: updatedSession.intakeComplete
        }, session.customerId || null);

        if (savedCustomer && savedCustomer.id) {
          session.customerId = savedCustomer.id;
        }
      }

      // Save conversation turns
      await customerService.saveConversation({
        sessionId: session.sessionId,
        customerId: session.customerId || null,
        role: 'user',
        message: cleanMessage
      });

      await customerService.saveConversation({
        sessionId: session.sessionId,
        customerId: session.customerId || null,
        role: 'assistant',
        message: llmResult.message,
        safetyAlert: llmResult.safetyAlert,
        diagnosticContext: {
          category: updatedSession.categoryIdentified,
          suggestedAction: updatedSession.suggestedServiceAction
        }
      });
    } catch (dbErr) {
      console.warn('Database persistence warning in chatService:', dbErr.message);
    }

    const matchedKnowledge = searchKnowledge(cleanMessage).slice(0, 2);

    return {
      sessionId: updatedSession.sessionId,
      reply: llmResult.message,
      safetyAlert: llmResult.safetyAlert,
      customerProfile: updatedSession.customerInfo,
      intake: {
        isComplete: updatedSession.intakeComplete,
        missingFields: updatedSession.missingFields,
        completedFields: Object.keys(updatedSession.customerInfo).filter(
          k => updatedSession.customerInfo[k] && updatedSession.customerInfo[k] !== 'Unknown'
        ),
        progressPercentage: Math.round(
          ((7 - updatedSession.missingFields.length) / 7) * 100
        )
      },
      diagnosticContext: {
        category: updatedSession.categoryIdentified,
        suggestedAction: updatedSession.suggestedServiceAction,
        matchedKnowledge: matchedKnowledge.map(k => ({
          category: k.category,
          issue: k.topic.id,
          safetyLevel: k.safetyLevel,
          recommendation: k.topic.recommendedAction
        }))
      },
      databaseRecord: savedCustomer,
      updatedAt: updatedSession.updatedAt
    };
  }
}

module.exports = new ChatService();
