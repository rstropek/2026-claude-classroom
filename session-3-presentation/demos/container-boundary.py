"""One disposable container mount policy, exercised by shell and Python."""
import os
import pathlib
import subprocess
import tempfile

image = 'python:3.13-alpine'
subprocess.run(['docker', 'image', 'inspect', image], check=True, stdout=subprocess.DEVNULL)
probe = r'''
import errno, pathlib, subprocess
for label, target, allowed in [('workspace', '/workspace', True), ('root filesystem', '/opt', False)]:
    shell = subprocess.run(['sh', '-c', 'printf demo > "$1"', 'sh', target + '/shell.txt'], capture_output=True, text=True)
    if allowed:
        assert shell.returncode == 0, shell.stderr
    else:
        assert shell.returncode != 0 and 'read-only' in shell.stderr.lower(), shell.stderr
    print('Shell:', label, 'WRITE SUCCEEDED' if shell.returncode == 0 else 'BLOCKED (read-only)', flush=True)
    try:
        pathlib.Path(target + '/python.txt').write_text('demo')
    except OSError as error:
        assert not allowed and error.errno == errno.EROFS, repr(error)
        print('Python:', label, 'BLOCKED (read-only)', flush=True)
    else:
        assert allowed, 'Unexpected write outside workspace'
        print('Python:', label, 'WRITE SUCCEEDED', flush=True)
'''
with tempfile.TemporaryDirectory(prefix='classroom-container-demo-') as directory:
    # Root is used only for this tiny, offline probe to ensure a failure proves
    # a read-only mount rather than Unix file ownership. No capabilities remain.
    subprocess.run(['docker', 'run', '--rm', '--pull=never', '--network=none',
                    '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges',
                    '--memory=128m', '--cpus=1', '--pids-limit=32',
                    '--mount', f'type=bind,src={directory},dst=/workspace',
                    image, 'python', '-c', probe], check=True)
    assert {p.name for p in pathlib.Path(directory).iterdir()} == {'shell.txt', 'python.txt'}
    print('Verified both workspace files. Disposable workspace is now removed.')
