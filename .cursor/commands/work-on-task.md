# Work on Task

Use task-guardian MCP to pick up and complete a task from the backlog.

## Steps

1. **Review available tasks**
   - Use `mcp_task-guardian_list_tasks` with `status: "pending"` to see backlog
   - Or use `mcp_task-guardian_query_tasks` for filtered/sorted results
   - Review task descriptions and dependencies

2. **Claim a task**
   - Use `mcp_task-guardian_update_task` to set `status: "in_progress"`
   - Check for blocking dependencies first
   - Only one task should be in_progress at a time

3. **Complete the work**
   - Implement the task as described
   - Follow project conventions and patterns
   - Create follow-up tasks if scope expands

4. **Close out**
   - Use `mcp_task-guardian_update_task` to set `status: "completed"`
   - Add any new tasks discovered with `mcp_task-guardian_create_task`

## Task Guardian Checklist

- [ ] Listed pending tasks before starting
- [ ] Verified no blocking dependencies
- [ ] Marked task as in_progress
- [ ] Completed work as described
- [ ] Marked task as completed
- [ ] Created follow-up tasks if needed

