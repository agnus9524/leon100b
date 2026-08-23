import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

old_exchange = """      } catch (e) {
        console.warn(`[KIS Service] Exchange rate trial failed for ${trial.endpoint} (${trial.trId})`, e);
      }
    }"""

new_exchange = """      } catch (e: any) {
        if (e?.response?.status === 429) {
          console.warn(`[KIS Service] 429 Rate Limit for ${trial.trId}. Waiting before next trial...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.warn(`[KIS Service] Exchange rate trial failed for ${trial.endpoint} (${trial.trId})`, e);
        }
      }
    }"""

if old_exchange in content:
    content = content.replace(old_exchange, new_exchange)
    print("Patched getExchangeRate")
else:
    print("Could not find getExchangeRate catch block")

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
