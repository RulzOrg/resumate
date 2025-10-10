---
description: Check database schema and connection
allowed-tools: Bash(python*), Bash(psql*)
---

Check the database status:
1. Verify DATABASE_URL is set in environment
2. Run the schema check script: `python scripts/check-schema.py`
3. Report on database connection status and schema integrity
