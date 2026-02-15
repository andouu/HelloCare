# Chat Actions And Tools

Use this as the canonical tool list when prompting the LLM for tool calling.

## Actions -> Tool Names

1. Go to a page -> `navigate`
2. Update an action item -> `update_action_item`
3. Delete an action item -> `delete_action_item`
4. Delete a health note -> `delete_health_note`
5. Update health-note type -> `update_health_note_type`
6. Delete an appointment -> `delete_appointment`
7. Delete a past session -> `delete_session`
8. Open voice recorder for health notes -> `open_health_note_recorder`
9. Create an action item -> `create_action_item`
10. Create a health note (text) -> `create_health_note`
11. Create an appointment -> `create_appointment`
12. Create a past session record -> `create_session`

## Tool Inputs

### `navigate`
- Required: `page`
- Optional: `highlightId`
- `page` enum: `home`, `action_items`, `health_notes`, `appointments`, `past_sessions`, `schedule_appointment`, `doctor_visit_conversation`

### `update_action_item`
- Required: `id`
- Optional: `status`, `priority`, `type`
- `status` enum: `pending`, `in_progress`, `done`, `skipped`
- `priority` enum: `low`, `medium`, `high`
- `type` enum: `Medication`, `Exercise`, `Appointment`, `Other`

### `delete_action_item`
- Required: `id`

### `delete_health_note`
- Required: `id`

### `update_health_note_type`
- Required: `id`, `type`
- `type` enum: `Injury`, `Recurring pain`, `Temporary pain`

### `delete_appointment`
- Required: `id`

### `delete_session`
- Required: `id`

### `open_health_note_recorder`
- Required: none

### `create_action_item`
- Required: `title`
- Optional: `description`, `type`, `priority`, `dueBy`
- `dueBy` should be ISO 8601

### `create_health_note`
- Required: `title`, `description`
- Optional: `type`
- `type` enum: `Injury`, `Recurring pain`, `Temporary pain`

### `create_appointment`
- Required: `appointmentTime` (ISO 8601)

### `create_session`
- Required: `title`
- Optional: `summary`, `date` (ISO 8601)

## Accuracy Rules For LLM

1. Never invent IDs. Use IDs from context only.
2. If multiple records match and user did not disambiguate, ask a clarifying question.
3. If exactly one record clearly matches, call the tool with that ID.
4. For "all" requests, call the tool once per matching record.
5. Use `open_health_note_recorder` only for voice-record requests, not text note creation.
6. Use `navigate` only when user asks to move pages.
7. If no tool is needed, answer directly from context.
