const fs = require('fs');
const path = require('path');

const categoriesDir = path.join(__dirname, 'categories');

/**
 * Loads all category JSON files into a cached object.
 */
function loadAllKnowledge() {
  const knowledge = {};
  const files = fs.readdirSync(categoriesDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const categoryKey = file.replace('.json', '');
      const filePath = path.join(categoriesDir, file);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        knowledge[categoryKey] = content;
      } catch (err) {
        console.error(`Failed to load knowledge base file: ${file}`, err);
      }
    }
  }
  return knowledge;
}

const KNOWLEDGE_STORE = loadAllKnowledge();

/**
 * Search the knowledge base for relevant topics based on user symptoms/query.
 * @param {string} query 
 * @returns {Array<Object>} list of matched subtopics and relevant rules
 */
function searchKnowledge(query = '') {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\W+/).filter(w => w.length > 2);
  const results = [];

  for (const [catKey, category] of Object.entries(KNOWLEDGE_STORE)) {
    if (catKey === 'safetyEscalation' || catKey === 'safety_escalation') continue;

    if (category.subtopics && Array.isArray(category.subtopics)) {
      for (const topic of category.subtopics) {
        let score = 0;

        // Check Category Name, ID, Symptoms, and Causes
        const textToMatch = [
          catKey,
          category.name || '',
          topic.id,
          ...(topic.symptoms || []),
          ...(topic.potentialCauses || []),
          topic.criticalWarning || '',
          topic.recommendedAction || ''
        ].join(' ').toLowerCase();

        // Exact phrase check
        if (textToMatch.includes(lowerQuery)) {
          score += 10;
        }

        // Category name direct match
        if (catKey.toLowerCase().includes(lowerQuery) || (category.name && category.name.toLowerCase().includes(lowerQuery))) {
          score += 15;
        }

        // Word overlap
        for (const word of words) {
          if (textToMatch.includes(word)) {
            score += 2;
          }
        }

        if (score > 0) {
          results.push({
            category: category.name || catKey,
            categoryId: catKey,
            safetyLevel: category.safetyLevel,
            score,
            topic
          });
        }
      }
    }
  }

  // Sort by highest score first
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get the Safety Escalation protocols.
 */
function getSafetyProtocols() {
  return KNOWLEDGE_STORE.safetyEscalation || KNOWLEDGE_STORE.safety_escalation || null;
}

/**
 * Returns formatted context string to be injected into LLM prompt
 * @param {string} userMessage 
 * @returns {string} Context snippet
 */
function getRelevantContextString(userMessage = '') {
  const matches = searchKnowledge(userMessage);
  const safety = getSafetyProtocols();

  let context = '=== AUTOMOTIVE LOCAL KNOWLEDGE BASE CONTEXT ===\n';

  if (matches.length > 0) {
    context += `Found ${Math.min(matches.length, 3)} relevant diagnostic guidance notes:\n`;
    matches.slice(0, 3).forEach((m, idx) => {
      context += `\n[${idx + 1}] Category: ${m.category} (Risk Level: ${m.safetyLevel})\n`;
      context += `Issue: ${m.topic.id}\n`;
      context += `Associated Symptoms: ${(m.topic.symptoms || []).join(', ')}\n`;
      context += `Possible Causes (For technician exploration only): ${(m.topic.potentialCauses || []).join(', ')}\n`;
      if (m.topic.criticalWarning) {
        context += `CRITICAL WARNING: ${m.topic.criticalWarning}\n`;
      }
      context += `Recommended Diagnostic Action: ${m.topic.recommendedAction}\n`;
      if (m.topic.triageQuestions && m.topic.triageQuestions.length > 0) {
        context += `Suggested Triage Questions: ${m.topic.triageQuestions.join(' | ')}\n`;
      }
    });
  } else {
    context += 'No specific keyword matches found. Use general automotive triage and customer intake protocol.\n';
  }

  context += '\n=== MANDATORY SAFETY DIRECTIVES ===\n';
  context += '- 1. NEVER give a definitive diagnosis. State possible causes carefully.\n';
  context += '- 2. ALWAYS advise booking a certified technician inspection.\n';
  context += '- 3. IF SMOKE, FLAMES, SEVERE BRAKE LOSS, ACTIVE OVERHEATING, OR DANGEROUS STEERING FAILURE: Instruct driver to safely pull over, turn off engine, avoid hot radiator, and arrange towing.\n';

  return context;
}

module.exports = {
  KNOWLEDGE_STORE,
  loadAllKnowledge,
  searchKnowledge,
  getSafetyProtocols,
  getRelevantContextString
};
