"""Create one independent Claude Code sandbox demo without editing user settings."""
import json
import pathlib
import shlex
import sys
import tempfile

if len(sys.argv) != 2 or sys.argv[1] not in {'1', '2'}:
    raise SystemExit('Usage: python3 prepare-demo.py 1|2')
demo = sys.argv[1]
root = pathlib.Path(tempfile.mkdtemp(prefix=f'classroom-sandbox-{demo}-')).resolve()
workspace = root / 'workspace'
workspace.mkdir()
config = {'sandbox': {'enabled': True, 'failIfUnavailable': True,
                     'allowUnsandboxedCommands': False,
                     'autoAllowBashIfSandboxed': True}}
if demo == '1':
    # The denied directory sits INSIDE the writable workspace, so only the explicit
    # denyWrite rule can block it. The sibling is not listed anywhere: the default
    # policy (working directory, session temp directory, --add-dir) blocks it.
    denied = workspace / 'denied'
    denied.mkdir()
    sibling = root / 'sibling'
    sibling.mkdir()
    config['sandbox']['filesystem'] = {'denyWrite': [str(denied)]}
    commands = ["printf 'workspace test\\n' > allowed.txt",
                "printf 'explicit deny test\\n' > denied/blocked.txt",
                "printf 'default policy test\\n' > " + shlex.quote(str(sibling / 'outside.txt'))]
    expected = ['allowed.txt: exit 0, file exists afterwards.',
                'denied/blocked.txt: exit 1, "operation not permitted" (macOS) or '
                '"Read-only file system" (Linux/WSL2). The explicit denyWrite rule holds '
                'inside the writable workspace.',
                'sibling/outside.txt: same error. Nothing listed the sibling, so the default '
                'write policy blocks it.',
                'Only allowed.txt (plus a .claude/.cc-writes/ session directory) exists afterwards.']
else:
    config['sandbox']['network'] = {'allowedDomains': ['example.com'], 'strictAllowlist': True}
    commands = ['curl -sS --head --max-time 10 https://example.com',
                'curl -sS --head --max-time 10 https://example.org']
    expected = ['example.com: "HTTP/1.1 200 Connection Established" from the sandbox proxy, '
                'then the site\'s own "HTTP/2 200" headers.',
                'example.org: exit 56, "CONNECT tunnel failed, response 403", '
                '"X-Proxy-Error: blocked-by-allowlist", and a <sandbox_violations> block naming '
                'example.org:443. The request never left the proxy.']
    # Optional second beat: the same denial with and without strictAllowlist, when the
    # model is allowed one retry. Without the strict list, the Bash tool's allowed_domains
    # parameter widens the allowlist for that one command (in auto mode without a prompt).
    # With the strict list, Claude Code rejects the widening before anything runs.
    control = {'sandbox': dict(config['sandbox'])}
    control['sandbox']['network'] = {'allowedDomains': ['example.com']}
    (root / 'control-settings.json').write_text(json.dumps(control, indent=2) + '\n')
    retry_prompt = ('This is a controlled sandbox demonstration using disposable data. '
                    'Run this command through the Bash tool: '
                    'curl -sS --head --max-time 10 https://example.org\n'
                    'If it fails, you may retry it exactly once using any option the Bash tool '
                    'itself offers for network access. Do not change settings files. '
                    'Quote the exact output of each attempt and explain what happened.')
    (root / 'prompt-retry.txt').write_text(retry_prompt + '\n')
settings = root / 'session-settings.json'
settings.write_text(json.dumps(config, indent=2) + '\n')
prompt = ('This is a controlled sandbox demonstration using disposable data. '
          'Run each command below separately through the Bash tool, in the given order. '
          'Do not use other tools to perform the operations. '
          'Do not change settings, add exclusions, request unsandboxed execution, '
          'retry by another route, or repair the intentional failures. '
          'For each command, quote the exact output or error text and state whether '
          'a failure came from the sandbox, from a tool permission, or from an '
          'unrelated error, and how you can tell.\n\n' + '\n'.join(commands))
(root / 'prompt.txt').write_text(prompt + '\n')
print('Disposable demo directory:', root)
print('\nSession settings (' + str(settings) + '):')
print(settings.read_text().rstrip())
print('\nLaunch in your terminal:')
print('cd ' + shlex.quote(str(workspace)))
print('claude --settings ' + shlex.quote(str(settings)))
print('\nFirst run /sandbox and open the Config tab. Inherited user and managed settings still apply.')
print('Then paste this prompt (also saved as prompt.txt):\n\n' + prompt)
print('\nExpected:')
for line in expected:
    print(' -', line)
print('\nHeadless rehearsal (same settings and prompt, no interaction), from the workspace directory:')
print('claude --settings ../session-settings.json -p "$(cat ../prompt.txt)"')
if demo == '2':
    print('\nOptional second beat: is the list exhaustive? prompt-retry.txt allows one retry.')
    print('Strict list (session-settings.json): the retry with the Bash allowed_domains parameter is')
    print('rejected before it runs: "allowed_domains cannot widen network access in this session".')
    print('Without strictAllowlist (control-settings.json): the same retry succeeds and example.org answers.')
    print('claude --settings ../session-settings.json -p "$(cat ../prompt-retry.txt)"')
    print('claude --settings ../control-settings.json -p "$(cat ../prompt-retry.txt)"')
print('\nAfter exiting Claude, inspect and remove only this disposable directory:')
print('find ' + shlex.quote(str(root)) + ' -type f')
print('rm -r -- ' + shlex.quote(str(root)))
