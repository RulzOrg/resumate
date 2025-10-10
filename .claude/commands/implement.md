---
argument-hint: [task-list-file] [task-number or "start" or "continue"]
description: Implement tasks from a task list
---

Process task list: $ARGUMENTS

Follow the implementation process in `/ai-dev-tasks/process-task-list.md`:

1. Read the task list from `/ai-dev-tasks/task-lists/`
2. Determine which task(s) to work on based on the argument:
   - If "start": Begin with Task 1
   - If "continue": Resume from last completed task
   - If task number: Implement that specific task
3. Check task dependencies before starting
4. For each task:
   - Read existing files mentioned
   - Plan and implement changes following CLAUDE.md patterns
   - Verify acceptance criteria
   - Mark task as complete
   - Report progress
5. After each task, ask if user wants to continue
6. Test changes and maintain code quality throughout
