#!/bin/bash
# Install Ralph skills to Claude Code's local skills directory
# Usage: ./install-skills.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"

echo "Installing Ralph skills to $CLAUDE_SKILLS_DIR..."

# Create skills directories if they don't exist
mkdir -p "$CLAUDE_SKILLS_DIR/prd"
mkdir -p "$CLAUDE_SKILLS_DIR/ralph"

# Copy skill files
cp "$SCRIPT_DIR/skills/prd/SKILL.md" "$CLAUDE_SKILLS_DIR/prd/"
cp "$SCRIPT_DIR/skills/ralph/SKILL.md" "$CLAUDE_SKILLS_DIR/ralph/"

echo "Skills installed successfully!"
echo ""
echo "You can now use these skills in Claude Code:"
echo "  - /prd     - Generate a Product Requirements Document"
echo "  - /ralph   - Convert a PRD to prd.json format for Ralph"
