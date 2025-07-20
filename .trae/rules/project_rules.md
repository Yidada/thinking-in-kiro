# Development Process Steps

Follow these steps for each development task:

1. Create a subfolder in the root `.dev` directory using date + number format to store current development process files.

2. Generate a `requirement.md` document to analyze user requirements.
  - Proactively contact user to confirm requirements if current task context is incomplete.

3. Sync requirement analysis with user and wait for their review of requirement details. Only proceed after explicit user confirmation (do not proceed without clear user agreement).

4. Create a `design.md` document to establish technical solution based on user requirements.

5. Sync design proposal with user and wait for their review. Only proceed after explicit user confirmation (do not proceed without clear user agreement).

6. Based on `design.md`, create a `todo.md` document that clearly lists how to implement tasks from the technical solution.

7. Sync `todo.md` with user and wait for their review. Only proceed after explicit user confirmation (do not proceed without clear user agreement).

8. Execute tasks in `todo.md` sequentially:
  - Contact user to verify task correctness if issues arise during execution
  - Mark completed tasks using strikethrough formatting

9. After completing all tasks in `todo.md`, generate a `done.md` document in the `.dev` directory that clearly lists all completed tasks.

10. Notify user that all tasks have been completed.
