import sys

with open('server.ts', 'r') as f:
    content = f.read()

retry_logic = """const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function generateContentWithRetry(model: any, prompt: any, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      const errMsg = error.message || '';
      const isRateLimit = error.status === 429 || errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('Too Many Requests');
      
      if (isRateLimit && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1500 + Math.random() * 1000;
        console.warn(`[Gemini API] 429 Rate Limit/Quota Hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
}
"""

if 'async function generateContentWithRetry' not in content:
    content = content.replace(
        'const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;',
        'const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;\n\n' + retry_logic
    )

content = content.replace('await model.generateContent(prompt)', 'await generateContentWithRetry(model, prompt)')
content = content.replace('await model.generateContent(`${systemPrompt}\\n\\nUser Request: ${prompt}`)', 'await generateContentWithRetry(model, `${systemPrompt}\\n\\nUser Request: ${prompt}`)')
content = content.replace('await model.generateContent({\n        contents:', 'await generateContentWithRetry(model, {\n        contents:')

with open('server.ts', 'w') as f:
    f.write(content)

print("Patched server.ts with retry logic")
