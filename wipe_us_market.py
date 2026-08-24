import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace any US market logic with KR logic hardcoded.

content = content.replace("const [marketType, setMarketType] = useState<'KR' | 'US'>('KR');", "const [marketType, setMarketType] = useState<'KR' | 'US'>('KR');\n// Forced to KR always")

# find the handleMarketSwitch function and make it do nothing or always KR
content = re.sub(
    r"const handleMarketSwitch = \(newMarket: 'KR' \| 'US'\) => \{[\s\S]*?\}",
    """const handleMarketSwitch = (newMarket: 'KR' | 'US') => {
    // Disabled US market completely
    if (newMarket === 'US') {
      showNotification('해외 주식은 현재 지원되지 않습니다.', 'error');
      return;
    }
  }""",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
