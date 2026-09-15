# Ask Claude to configure Claude

Inspect my operating system, installed Claude Code version, current repository and effective settings. Read https://code.claude.com/llms.txt and the relevant current documentation first.

My requirements are:

- Writable workspace: [project paths].
- Build and test tools: [tools and required cache paths].
- Approved external services: [exact destinations and why they are needed].
- Sensitive files and environment variables to withhold: [names and paths only, no secret values].
- Approved local and remote MCP servers: [list and required actions].
- Team infrastructure boundary: [container, VM, dedicated machine, or none].

Propose the smallest useful Claude Code sandbox and permission configuration. Distinguish Bash sandboxing, in-process file tools, hooks, local MCP processes, remote services and model-provider traffic. Explain each exception and any platform or version limitation.

Show a diff and the scope for each setting: user, project, local or managed. Explain merged lists and possible unsandboxed execution routes. Flag organizational policy that this repository cannot enforce.

Include exact documentation links and one positive and one negative test per boundary, using dummy files and no real secrets. Show expected results and how to distinguish an OS/proxy denial from a permission prompt or a broken dependency. Keep the proposal ready for review before applying it.

---

## How to use this prompt (presenter notes)

- Fill every bracketed placeholder with real names and paths. Name credentials by purpose and scope only; never paste a value.
- Start Claude in plan mode so the proposal cannot be applied before you have read it: `claude --permission-mode plan`. The prompt asks for a reviewable proposal, plan mode enforces it.
- Review checklist: every widened path and destination has a stated reason; every setting names its scope (user, project, local, managed) and the docs say that scope honors the key; keys that only work from user, managed or `--settings` sources (`strictAllowlist`, `filesystem.disabled`, credential `mask` entries, `allowAppleEvents`) are not proposed in `.claude/settings.json`; each boundary has one positive and one negative test; links resolve on code.claude.com.
- Apply the proposal yourself, then run the tests. A denied operation without a matching successful one proves nothing: a broken tool looks the same as a working boundary.
