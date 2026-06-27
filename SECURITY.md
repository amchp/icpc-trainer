# Security Policy

## Supported Versions

ICPC Trainer is pre-1.0. Security fixes target the current `main` branch unless a maintainer explicitly announces supported release branches.

## Reporting Vulnerabilities

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting if it is enabled for the repository, or contact a maintainer privately.

Include:

- Affected component or route.
- Steps to reproduce.
- Expected impact.
- Any logs, stack traces, or screenshots that do not expose secrets.
- Whether you believe any credentials, user data, or third-party accounts were accessed.

Maintainers will acknowledge valid reports as soon as practical, coordinate a fix, and publish public details only after a patch or mitigation is available.

## Secrets And User Data

This project handles Clerk auth secrets, database tokens, internal task tokens, judge API keys, and encrypted judge credentials. Treat all of those as sensitive. If a secret is exposed, revoke and rotate it immediately.

Do not test against accounts, teams, databases, or judge credentials that you do not own or have explicit permission to use.
