import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"const handleMarketSwitch = async \(newMarket: 'KR' \| 'US'\) => \{[\s\S]*?\n  \};",
    """const handleMarketSwitch = async (newMarket: 'KR' | 'US') => {
    if (newMarket === 'US') {
      showNotification('해외 주식은 현재 지원되지 않습니다.', 'error');
      return;
    }
  };""",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
