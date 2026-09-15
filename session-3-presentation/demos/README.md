# Session 3: small sandbox demonstrations

Each demo is independent and illustrates one boundary. Allow about 3 minutes per demo in addition to the 40–45 minute presentation. Use disposable data. The commands do not configure your real project or change your personal Claude settings.

Verified on 15 September 2026 with Claude Code 2.1.272 on macOS (Seatbelt), Docker Engine 28.5.1 (Docker Desktop) and model Opus 5. Opus 5 ran exactly the requested commands, quoted the errors, attributed them correctly to the sandbox and made no attempt to work around them, with or without the guard-rail wording in the prompt. The guard rails still earn their place: with them, the explanation on screen separates sandbox denial from tool permission and unrelated errors, which is the point of the demo.

## Prerequisites and rehearsal

- Demos 1 and 2: Python 3, an authenticated Claude Code CLI, and a supported Bash sandbox (macOS, Linux or WSL2). Linux/WSL2 require bubblewrap and socat. Open `/sandbox` and check dependency status. Record `claude --version` before class.
- Demo 2 uses `sandbox.network.strictAllowlist`, documented from v2.1.219. It is honored only from user, managed or CLI `--settings` sources, never from a repository's `.claude/settings.json`. The demo therefore passes it on the command line.
- Demo 3: a running Docker engine and the `python:3.13-alpine` image. Pre-pull it with `docker pull python:3.13-alpine` before class. The demo itself uses `--pull=never` and no container network. For a repeatable classroom environment, record the pulled image digest and use the same image during rehearsal and delivery.
- Existing user and managed settings still apply. Inspect the resolved `/sandbox` configuration before each Claude demo. Confirm no relevant command exclusions, no disabled filesystem layer, and no unexpected allowed destination. Do not override organizational policy to make the demo run.
- Rehearse headless. The helper prints a one-line `claude -p` command that runs the same settings and prompt without interaction and finishes in well under a minute. Run it once before class from the printed workspace directory. The interactive session behaves the same way; the only difference is that you can open `/sandbox` first.
- Every Claude session creates an empty `.claude/.cc-writes/` directory inside the workspace. It is Claude Code's own bookkeeping, not a demo artifact.

## Demo 1: one blocked file write (slide 7)

From this directory:

```sh
python3 prepare-demo.py 1
```

The helper prints the disposable directory, the session settings, launch commands, the prompt and the expected results. It creates:

- `workspace/`, the directory you launch Claude from. Writable by default.
- `workspace/denied/`, listed in `sandbox.filesystem.denyWrite`. Only this explicit rule can block it, because its parent is writable.
- `sibling/`, next to the workspace and listed nowhere. The default write policy blocks it: sandboxed commands may write only to the working directory, the session temp directory and directories added with `--add-dir`.

The session configuration requires sandbox availability, disables unsandboxed retries and keeps sandbox auto-allow on, so all three commands reach Bash without a permission prompt.

1. Open `/sandbox` and inspect the Config tab. The `denied/` path appears under "Denied within allowed", mixed in with Claude Code's built-in protected paths.
2. Paste the generated prompt, which requests three separate Bash writes.
3. Observe the results:

   | Target | Result | Why |
   | :-- | :-- | :-- |
   | `allowed.txt` | exit 0 | working directory is writable |
   | `denied/blocked.txt` | exit 1, `operation not permitted` | explicit `denyWrite` rule inside the writable workspace |
   | `../sibling/outside.txt` | exit 1, `operation not permitted` | default policy: not listed anywhere |

   On Linux and WSL2 the error text is `Read-only file system` instead.
4. Exit Claude and run the printed `find` command from the host. Only `allowed.txt` exists.
5. Run the printed cleanup command for that exact directory.

Expected: the commands reach Bash and the OS rejects the two forbidden writes. The shell itself reports the error (`(eval):1: operation not permitted: ...`), which is how you tell OS enforcement from a permission denial: a permission denial stops the call before any shell runs. Opus 5 makes exactly this argument on screen. It may add that the denied-path list shown to it is truncated; the full list is in `/sandbox` Config.

Do not type the test with Claude's `!` shell mode: user-typed commands run outside the Bash sandbox in an ordinary interactive session. Do not let Claude use Edit or Write for the test: the in-process file tools use the permission system, not the sandbox.

## Demo 2: one blocked destination (slide 9)

Start fresh, without relying on Demo 1:

```sh
python3 prepare-demo.py 2
```

1. Launch Claude using the printed CLI settings file. It allows `example.com` and sets `strictAllowlist`, so an unlisted host is denied instead of triggering a permission prompt or, in auto mode, the classifier.
2. Inspect `/sandbox` and confirm `example.org` is absent from the effective allowed destinations, including inherited `WebFetch(domain:...)` allow rules.
3. Paste the generated prompt. It runs a quiet HEAD request to `example.com`, then to `example.org`. It follows no redirects and sends no credentials or body data.
4. Observe the two results:

   ```text
   HTTP/1.1 200 Connection Established     <- the sandbox proxy admitted the host
   
   HTTP/2 200                              <- example.com's own answer
   date: ...
   ```

   ```text
   curl: (56) CONNECT tunnel failed, response 403
   HTTP/1.1 403 Forbidden
   Content-Type: text/plain
   X-Proxy-Error: blocked-by-allowlist

   <sandbox_violations>
   deny network-outbound example.org:443 (host is not on the allow list)
   </sandbox_violations>
   ```

   Point at the first line of each: every sandboxed connection is a CONNECT through the proxy, and the proxy decides on the requested hostname alone. It never inspects the TLS payload, which is the "remaining exposure" on slide 8.
5. Exit Claude and run this demo's printed cleanup command.

A timeout, TLS issue or DNS failure alone does not prove enforcement. Enforcement looks like the 403 with `X-Proxy-Error: blocked-by-allowlist`. If the allowed request cannot reach the site, resolve connectivity during rehearsal or skip the live execution. A domain policy is not an authorization or content-filtering policy.

### Optional second beat: what `strictAllowlist` actually changes

The 403 above does not depend on `strictAllowlist`. With `allowedDomains` alone, the proxy returns the identical denial, only the hint in the violation block differs: it invites the model to re-run the command with the host listed. The Bash tool has an `allowed_domains` parameter for exactly that, and in auto mode the retry runs without a prompt. `strictAllowlist` is what makes the configured list exhaustive.

The helper writes two extra files for this: `prompt-retry.txt`, which allows the model exactly one retry "using any option the Bash tool itself offers", and `control-settings.json`, identical to the session settings minus `strictAllowlist`. Run the retry prompt in both configurations, one after the other, from the workspace directory:

```sh
claude --settings ../session-settings.json -p "$(cat ../prompt-retry.txt)"   # strict
claude --settings ../control-settings.json -p "$(cat ../prompt-retry.txt)"   # control
```

| Configuration | First attempt | Retry with the Bash `allowed_domains` parameter |
| :-- | :-- | :-- |
| strict | 403, `blocked-by-allowlist` | rejected before it runs: `allowed_domains cannot widen network access in this session: the configured sandbox allowlist is the whole allowlist here (a managed-domains-only or strictAllowlist policy, ...)` |
| control | 403, `blocked-by-allowlist` | succeeds, example.org answers `HTTP/2 200` |

Verified on Opus 5 in both configurations. The lesson matches slide 8: without the strict flag, `allowedDomains` is a default the agent can extend during a task; with it, the list is the policy. The same holds for an administrator's `allowManagedDomainsOnly`.

## Demo 3: one boundary, two tools (slide 21)

This example needs no model account and does not depend on either earlier demo:

```sh
python3 container-boundary.py
```

Expected output:

```text
Shell: workspace WRITE SUCCEEDED
Python: workspace WRITE SUCCEEDED
Shell: root filesystem BLOCKED (read-only)
Python: root filesystem BLOCKED (read-only)
Verified both workspace files. Disposable workspace is now removed.
```

One container has a read-only root filesystem and one writable workspace mount. Both shell and Python obey that same mount policy. The assertions reject generic failures: the blocked operation must report a read-only filesystem. This demonstrates two representative tools under a common boundary, not two complete coding agents.

The tiny probe runs as container root with all capabilities dropped, no network and no host sockets. This is deliberate so that the negative result demonstrates the read-only filesystem rather than file ownership. A production agent baseline should run as a non-root user, as discussed on slide 15. `--rm` removes the container and the Python context manager removes the disposable host directory. The pre-pulled image remains available for repetition. The run takes about two seconds.

## Ask Claude to configure Claude (slide 12)

`configure-claude-prompt.md` is the reusable prompt behind slide 12. Fill in the bracketed placeholders for a real repository and run it in plan mode so nothing is applied before review:

```sh
claude --permission-mode plan
```

See the notes at the end of that file for what to expect and how to review the proposal.

## Official references

- [Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing)
- [Sandbox environments](https://code.claude.com/docs/en/sandbox-environments)
- [Settings scopes](https://code.claude.com/docs/en/settings)
- [Sandbox settings reference](https://code.claude.com/docs/en/settings-reference#sandbox-settings)
- [Docker security](https://docs.docker.com/engine/security/)

Research date: 13 September 2026. Demos verified: 15 September 2026. Rehearse with the same OS, CLI version and managed policy that you will use during class.
