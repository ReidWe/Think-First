/* ============================================
   chat.js - Demo chatbot with hardcoded
   responses. Swap getResponse() for a real
   API call when ready.
   ============================================ */

const responses = {
  "explain what open ai policy means": "Open AI policy means moving from blanket bans and secrecy to structured, transparent guidance. Rather than prohibiting AI tools and hoping students comply, it argues for teaching students when and how to use AI. The 'Think First' framework we propose requires students to do their initial brainstorming without AI, then bring it in as a late-stage tool for expanding and refining their own ideas. As de Araujo and Schneider (2025) argue, AI should be subordinate to the student, not the other way around.",

  "why does ai transparency matter?": "When students document how they used AI through collaboration statements, instructors can evaluate the process rather than policing the product. This is more effective than unreliable AI detection software and shifts the focus from catching cheaters to fostering genuine academic integrity. Our survey found that 47% of Syracuse students introduce AI during prewriting or drafting. A transparency protocol does not ban that use; it makes it visible and accountable, so students learn to reflect on their own cognitive process.",

  "what did your survey find?": "We surveyed 15 Syracuse students across 8 schools. Key findings: average confidence in original ideation is 8.3 out of 10, but the two students who rated their confidence at 6 out of 10 both use AI 'always' or 'often,' while those who rarely use AI scored 9 and 10. Additionally, 47% introduce AI during prewriting or drafting, exactly when independent thinking matters most. AI policy clarity varied wildly: Architecture scored 10 out of 10, while Newhouse scored only 6. Even within Engineering and CS, scores ranged from 5 to 10. Every student reported using AI at some frequency.",

  "how can i get involved in ai policy?": "Start at Syracuse: 1) Talk to your professors about implementing a 'Think First' protocol in their courses. 2) Email your dean and ask why AI policy differs across schools. 3) Share this page with classmates to start a conversation. 4) Advocate for a unified AI-Assisted Ideation Protocol through student government. 5) Check Syracuse's current AI guidelines at its.syr.edu and provide feedback. The Think First framework costs nothing to implement and fits into existing WRT 105 and WRT 205 curriculum."
};

/**
 * Get a response for the given message.
 * To connect a real API later, replace the body of this
 * function with a fetch() call and make it async.
 */
function getResponse(msg) {
  const key = msg.toLowerCase();
  return responses[key] || "That's a great question! In a live version, this would connect to an AI service to give you a real answer about open AI policy.";
}

function setPrompt(btn) {
  const input = document.getElementById('userInput');
  input.value = btn.textContent;
  sendMessage();
}

function sendMessage() {
  const input = document.getElementById('userInput');
  const msg = input.value.trim();
  if (!msg) return;

  const chat = document.getElementById('chatMessages');

  // User bubble
  chat.innerHTML += `<div class="message user"><div class="message-bubble">${msg}</div></div>`;
  input.value = '';

  // Typing indicator
  chat.innerHTML += `<div class="message assistant" id="typing"><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
  chat.scrollTop = chat.scrollHeight;

  // Simulated delay then response
  setTimeout(() => {
    const typingIndicator = document.getElementById('typing');
    if (typingIndicator) typingIndicator.remove();
    const reply = getResponse(msg);
    chat.innerHTML += `<div class="message assistant"><div class="message-bubble">${reply}</div></div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 1500);
}
