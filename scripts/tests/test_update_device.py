"""Exercise download preflight without touching a device or invoking sudo."""
import hashlib
import io
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'update-device.sh'
MOCK = '''#!/usr/bin/env python3
import hashlib, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
if name == 'id': print('vinoth')
elif name == 'uname': print('Linux' if args == ['-s'] else 'aarch64')
elif name == 'systemctl': print('vinoth')
elif name == 'sudo':
    pathlib.Path(os.environ['TEST_ROOT'], 'sudo-called').touch()
    sys.exit(42) # Stop before any install/service mutation.
elif name == 'curl':
    url = next(a for a in args if a.startswith('https://'))
    with open(os.environ['TEST_ROOT'] + '/requests', 'a') as log: log.write(url + '\\n')
    if url.endswith('/latest'):
        print('https://github.com/vinothpandian/inkdash/releases/tag/' + os.environ['TEST_TAG'], end='')
    else:
        dest = pathlib.Path(args[args.index('-o') + 1])
        source = pathlib.Path(os.environ['TEST_ROOT'], 'archive.tar.gz')
        if url.endswith('/SHA256SUMS'):
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            if os.environ.get('BAD_CHECKSUM'): digest = '0' * 64
            dest.write_text(digest + '  inkdash-' + os.environ['TEST_TAG'] + '-raspi-arm64.tar.gz\\n')
        else: dest.write_bytes(source.read_bytes())
elif name == 'sha256sum':
    digest, path = sys.stdin.read().strip().split('  ', 1)
    sys.exit(0 if hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest() == digest else 1)
'''


class UpdaterPreflight(unittest.TestCase):
    def run_update(self, tag='v9.8.7', bad_checksum=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binary = root / 'bin'
            binary.mkdir()
            mock = binary / 'mock'
            mock.write_text(MOCK)
            mock.chmod(0o755)
            for command in ['id', 'uname', 'systemctl', 'curl', 'sudo', 'sha256sum']:
                (binary / command).symlink_to(mock)
            with tarfile.open(root / 'archive.tar.gz', 'w:gz') as archive:
                for name in ['bin/inkdash', 'resources/frontend/dist/index.html']:
                    entry = tarfile.TarInfo('package/' + name)
                    entry.mode = 0o755
                    entry.size = 1
                    archive.addfile(entry, io.BytesIO(b'x'))
            env = dict(os.environ, PATH=str(binary) + ':' + os.environ['PATH'],
                       TEST_ROOT=directory, TEST_TAG=tag,
                       OPEN_THREADS_POCKETBASE_TOKEN='test.only.token')
            if bad_checksum:
                env['BAD_CHECKSUM'] = '1'
            result = subprocess.run(['bash', str(SCRIPT)], env=env, capture_output=True, text=True)
            self.assertNotIn('test.only.token', result.stdout + result.stderr)
            return result, (root / 'sudo-called').exists(), (root / 'requests').read_text()

    def test_resolves_latest_and_pins_both_downloads(self):
        result, sudo_called, requests = self.run_update()
        self.assertEqual(result.returncode, 42, result.stderr)
        self.assertTrue(sudo_called)
        self.assertIn('/v9.8.7/inkdash-v9.8.7-raspi-arm64.tar.gz', requests)
        self.assertIn('/v9.8.7/SHA256SUMS', requests)

    def test_bad_checksum_stops_before_service_commands(self):
        result, sudo_called, _ = self.run_update(bad_checksum=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(sudo_called)

    def test_unexpected_redirect_stops_before_download(self):
        result, sudo_called, requests = self.run_update(tag='not-a-version')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(sudo_called)
        self.assertEqual(len(requests.splitlines()), 1)


if __name__ == '__main__':
    unittest.main()
