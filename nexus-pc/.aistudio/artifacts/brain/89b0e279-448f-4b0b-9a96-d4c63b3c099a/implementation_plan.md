# Google AI Studio SKILL.md Architecture & Explanation

## Overview
Yes, Google AI Studio Build fully supports `SKILL.md` files as a core mechanism for extending the AI coding agent's capabilities with specialized domain knowledge, integrations, and architectural guidelines.

## How `SKILL.md` Works in AI Studio Build

1. **Modular Capability Extension**:
   - Instead of loading every possible technical guide into the global system prompt, AI Studio organizes specialized knowledge into modular skill directories located under `/skills/system_skills/` (or workspace skill directories).

2. **Skill Structure**:
   - **`SKILL.md`**: The required entry point featuring YAML frontmatter (`name`, `description`) and detailed Markdown instructions.
   - **Supplementary Directories**: Optional folders such as `references/`, `scripts/`, `examples/`, and `resources/` that provide deep technical documentation or helper scripts.

3. **The Skill Check Lifecycle**:
   - At the start of a new task or when context shifts, the agent performs a mandatory **Skill Check** to evaluate which available skills are relevant to the user request.
   - If a skill is deemed relevant, the agent must read the full `SKILL.md` file via `view_file` before writing or modifying code.

4. **Key Built-In Skills Available**:
   - **`frontend-design`**: Universal design constitution, typographic hierarchy, and anti-slop visual standards.
   - **`firebase-integration-rpc`**: Firestore database provisioning, security rules, and Auth integration.
   - **`cloudsql-setup` & `cloudsql-execute-sql`**: Relational PostgreSQL database management and DQL/DML operations.
   - **`google-maps-platform-ghp-integration`**: Maps, geocoding, routing, and places integration.
   - **`oauth-integration` & `workspace-integration`**: Third-party OAuth and 1P Google Workspace API integrations.
   - **`threejs` & `science`**: 3D spatial computing and scientific data rendering.
   - **`pwa-integration`**: Progressive Web App manifests and offline service workers.

## Summary
`SKILL.md` acts as a dynamic prompt-injection and instruction-retrieval system that ensures the agent follows best practices, correct API SDK usages, and robust architectural patterns tailored to the specific libraries and services requested by the user.
