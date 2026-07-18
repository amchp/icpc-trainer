#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "This installer supports Apple Silicon (arm64) only. Use the online fallback for an Intel Mac." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo "Installing Visual Studio Code and GCC..."
brew install --cask visual-studio-code
brew install gcc

code_bin="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
if [[ ! -x "$code_bin" ]]; then
  echo "VS Code installed, but its command-line tool was not found at $code_bin." >&2
  exit 1
fi

"$code_bin" --install-extension ms-vscode.cpptools --force

gcc_major="$(brew list --versions gcc | awk 'NR == 1 { split($2, version, "."); print version[1] }')"
compiler_path="/opt/homebrew/bin/g++-${gcc_major}"
if [[ -z "$compiler_path" || ! -x "$compiler_path" ]]; then
  echo "Homebrew GCC finished without a versioned g++ executable in /opt/homebrew/bin." >&2
  exit 1
fi

settings_directory="$HOME/Library/Application Support/Code/User"
settings_path="$settings_directory/settings.json"
mkdir -p "$settings_directory"

if [[ ! -x /usr/bin/python3 ]]; then
  echo "python3 is required to preserve and update VS Code settings.json." >&2
  exit 1
fi

SETTINGS_PATH="$settings_path" COMPILER_PATH="$compiler_path" /usr/bin/python3 <<'PY'
import json
import os
from pathlib import Path

path = Path(os.environ["SETTINGS_PATH"])
try:
    settings = json.loads(path.read_text()) if path.exists() and path.read_text().strip() else {}
except json.JSONDecodeError as error:
    raise SystemExit(f"VS Code settings.json is invalid at {path}: {error}")

settings.update({
    "C_Cpp.default.compilerPath": os.environ["COMPILER_PATH"],
    "C_Cpp.default.cStandard": "c17",
    "C_Cpp.default.intelliSenseMode": "macos-gcc-arm64",
})
path.write_text(json.dumps(settings, indent=2) + "\n")
PY

shell_profile="$HOME/.zprofile"
shell_line='eval "$(/opt/homebrew/bin/brew shellenv)"'
touch "$shell_profile"
if ! grep -Fq "$shell_line" "$shell_profile"; then
  printf '\n%s\n' "$shell_line" >> "$shell_profile"
fi

echo "C++ setup complete. Compiler: $compiler_path"
"$compiler_path" --version
echo "Open a new terminal before compiling so it loads the Homebrew PATH."
