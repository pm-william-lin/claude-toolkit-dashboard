#!/bin/bash
# Claude Code SessionStart hook: scan toolkit and push changes if any

DASHBOARD_DIR="$HOME/claude-toolkit-dashboard"
cd "$DASHBOARD_DIR" || exit 0

# Save old data for diff
cp data.json data.json.old 2>/dev/null

# Run scan
node scripts/scan.js > /dev/null 2>&1

# Check if data changed
if ! diff -q data.json data.json.old > /dev/null 2>&1; then
  echo "Claude Toolkit: changes detected since last scan!"
  diff --unified=0 data.json.old data.json | grep '^[+-]' | grep -v '^[+-][+-][+-]' | head -10

  # Auto-commit and push
  git add data.json usage.json
  git commit -m "chore: auto-update toolkit data $(date +%Y-%m-%d)" > /dev/null 2>&1
  git push origin main > /dev/null 2>&1 && echo "Dashboard updated and deployed."
fi

rm -f data.json.old
