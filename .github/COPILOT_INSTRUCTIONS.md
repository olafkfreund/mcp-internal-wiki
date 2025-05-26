# Copilot Instructions for Future Feature Work

- When adding new endpoints, follow the RESTful pattern used in `src/routes.ts`.
- For authentication, use middleware and consider JWT for API security.
- To support more wiki formats, add format detection and parsing logic in `WikiManager`.
- Implement caching using an in-memory store or Redis for scalability.
- For periodic refresh, use `node-cron` or similar scheduling libraries.
- When building a web UI, use a separate frontend directory and connect via API.
- For VS Code/Cursor extension, expose a simple API and document endpoints clearly.
- Always add/modify tests in `test/` for new features or bug fixes.
- Update the README and project plan with any major changes.
