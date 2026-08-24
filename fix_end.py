import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# We want to replace the end of getTokenStatus to properly close it and the class.
# Right now it's:
'''
    return {
      status: 'valid',
      expiresAt: this.tokenExpireTime
    };
    public async getOverseasPrice...
'''
# We will just split at `    };\n    public async getOverseasPrice`
target = "    };\n    public async getOverseasPrice"
if target in content:
    content = content.replace(target, "    };\n  }\n\n  public async getOverseasPrice")

# Also we need to make sure the file exports kisService if it's missing
if "export const kisService = new KISService();" not in content:
    content += "\nexport const kisService = new KISService();\n"

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
