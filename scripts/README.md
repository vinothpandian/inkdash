# Raspberry Pi updates

Run `update-device.sh` as `vinoth` on 64-bit Raspberry Pi OS, with
`OPEN_THREADS_POCKETBASE_TOKEN` already exported. It updates an existing system
service; the default is `inkdash.service`, or pass its name as the first argument.

```sh
curl -fL https://github.com/vinothpandian/inkdash/releases/latest/download/update-device.sh -o update-inkdash.sh
bash update-inkdash.sh
```

Each run resolves the latest published stable release once, downloads that exact
version's ARM64 package, and verifies its SHA256SUMS entry before stopping the
service. Release checksums and this updater are published starting with v1.0.22.
No version edits are needed for future updates.

The script retains the previous app in a uniquely named backup directory and
prints its path on success. It does not automatically roll back a failed install.
The PocketBase environment file is written with mode 600; token values are never
printed. Do not run with shell tracing (`bash -x`).

Run the download preflight tests locally with:

```sh
python3 scripts/tests/test_update_device.py
```

These tests mock the host checks and downloads and stop before installation or
service changes. Actual installation must be verified on the Raspberry Pi.
