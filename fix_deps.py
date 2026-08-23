import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Extract handleRefreshScalperTop3
start_idx = content.find("const handleRefreshScalperTop3 = useCallback(async () => {")
end_idx = content.find("}, [showNotification, handleGetRecommendations]);", start_idx) + len("}, [showNotification, handleGetRecommendations]);")

if start_idx != -1 and end_idx != -1:
    block = content[start_idx:end_idx]
    # Remove it from the current position
    content = content[:start_idx] + content[end_idx:]
    
    # Insert it right after handleGetRecommendations
    target_idx = content.find("}, [marketType]);\n\n  // Trigger AI market analysis on mount and when market switch")
    if target_idx != -1:
        insert_idx = target_idx + len("}, [marketType]);\n")
        content = content[:insert_idx] + "\n  " + block + "\n" + content[insert_idx:]
        with open('src/App.tsx', 'w') as f:
            f.write(content)
        print("Moved handleRefreshScalperTop3 below handleGetRecommendations")
    else:
        print("Could not find insertion point")
else:
    print("Could not find handleRefreshScalperTop3")
