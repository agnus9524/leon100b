import sys

with open('server.ts', 'r') as f:
    content = f.read()

# Fix the recursion inside the function definition
content = content.replace(
    'return await generateContentWithRetry(model, prompt);',
    'return await model.generateContent(prompt);',
    1 # Only replace the first occurrence which is inside the function
)

with open('server.ts', 'w') as f:
    f.write(content)
print("Recursion fixed")
