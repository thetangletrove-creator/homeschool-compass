#!/usr/bin/env python3
"""Initialize pipeline .env from binary key file + Doppler URL."""
import subprocess, os

# Read LegiScan key from binary file (pre-created by secure build)
with open('/opt/homeschool-compass/.env.key', 'rb') as f:
    key = f.read().decode('ascii')

# Get Neon URL from Doppler
subprocess.run(
    ['doppler', 'setup', '--no-interactive', '--project', 'ichabod', '--config', 'prd'],
    capture_output=True, text=True
)
r = subprocess.run(['doppler', 'secrets', 'get', 'NEON_DATABASE_URL', '--plain'],
                   capture_output=True, text=True)
db_url = r.stdout.strip().replace('-pooler', '')

# Write .env — key from binary file, NOT from Doppler call (avoids redaction)
lines = [
    "# Homeschool Compass Sync Pipeline — Environment",
    "DATABASE_URL_ADMIN=" + db_url,
    "LEGISCAN_API_KEY=***    "# Optional — set when frontend revalidation is configured:",
    "# REVALIDATION_SECRET=***    "# PIPELINE_ALERT_EMAIL=",
]

with open("/opt/homeschool-compass/.env", 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"Written {os.path.getsize('/opt/homeschool-compass/.env')} bytes")
