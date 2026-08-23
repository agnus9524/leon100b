import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_logic = """    } catch (error) {
      console.error("Failed to get recommendations:", error);
    } finally {"""

new_logic = """    } catch (error: any) {
      console.error("Failed to get recommendations:", error);
      if (error.response && error.response.data && error.response.data.error) {
        showNotification("딥리서치 실패: " + error.response.data.error, "error");
      } else {
        showNotification("추천 종목을 불러오는데 실패했습니다. Gemini API 키를 확인해주세요.", "error");
      }
    } finally {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched frontend")
else:
    print("Could not patch frontend")

