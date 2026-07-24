#!/usr/bin/env bash

set -Eeuo pipefail

readonly CPP_STANDARD="c++17"
readonly C_STANDARD="c17"
readonly VSCODE_EXTENSION="ms-vscode.cpptools"
readonly BREW_BIN="/opt/homebrew/bin/brew"

log() {
    printf '\033[36m%s\033[0m\n' "$*"
}

die() {
    printf '\033[31mError: %s\033[0m\n' "$*" >&2
    exit 1
}

run() {
    "$@" || die "Command failed: $*"
}

require_macos() {
    [[ "$(uname -s)" == "Darwin" ]] || die "This script must be run on macOS."
}

require_apple_silicon() {
    if [[ "$(uname -m)" == "arm64" ]] || \
       [[ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" == "1" ]]; then
        return
    fi
    die "This installer supports Apple Silicon Macs only."
}

install_homebrew() {
    # A new Homebrew install may exist before its shellenv line has been added
    # to the user's profile. Initialize it without rerunning the installer.
    if [[ -x "$BREW_BIN" ]]; then
        eval "$("$BREW_BIN" shellenv)"
        return
    fi

    [[ -x /usr/bin/curl ]] || die "curl is required to install Homebrew."

    local installer
    installer="$(mktemp -t install-homebrew.XXXXXX)"
    log "Downloading the official Homebrew installer..."
    if ! /usr/bin/curl --proto '=https' --tlsv1.2 -fsSL \
        "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh" \
        -o "$installer"; then
        rm -f "$installer"
        die "Could not download the Homebrew installer."
    fi

    log "Installing Homebrew (the official installer may request confirmation and your password)..."
    if ! /usr/bin/arch -arm64 /bin/bash "$installer"; then
        rm -f "$installer"
        die "Homebrew installation failed."
    fi
    rm -f "$installer"

    [[ -x "$BREW_BIN" ]] || die \
        "Homebrew installed, but brew was not found at the expected path: $BREW_BIN"

    # Make the new installation available to the remainder of this run. The
    # Homebrew installer prints the shell-profile command needed for future terminals.
    eval "$("$BREW_BIN" shellenv)"
}

install_vscode() {
    if ! command -v code >/dev/null 2>&1 && \
       [[ ! -d "/Applications/Visual Studio Code.app" ]] && \
       [[ ! -d "$HOME/Applications/Visual Studio Code.app" ]]; then
        log "Installing Visual Studio Code..."
        run "$BREW_BIN" install --cask visual-studio-code
    fi

    if command -v code >/dev/null 2>&1; then
        CODE_BIN="$(command -v code)"
    elif [[ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
        CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    elif [[ -x "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
        CODE_BIN="$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    else
        die "VS Code is installed, but its command-line launcher could not be found."
    fi

    log "Installing the current Microsoft C/C++ extension for VS Code..."
    run "$CODE_BIN" --install-extension "$VSCODE_EXTENSION" --force
}

install_gcc() {
    if "$BREW_BIN" list --formula gcc >/dev/null 2>&1; then
        log "Updating Homebrew's GCC formula..."
        run "$BREW_BIN" upgrade gcc
    else
        log "Installing GCC and g++..."
        run "$BREW_BIN" install gcc
    fi

    local gcc_prefix
    gcc_prefix="$("$BREW_BIN" --prefix gcc)"
    GPP_BIN="$(find "$gcc_prefix/bin" -maxdepth 1 -type f -name 'g++-[0-9]*' | sort -t- -k2,2n | tail -n 1)"
    [[ -n "$GPP_BIN" && -x "$GPP_BIN" ]] || die \
        "GCC installation completed, but a Homebrew g++ executable was not found under $gcc_prefix/bin."
}

set_vscode_cpp_defaults() {
    [[ -x /usr/bin/osascript ]] || die \
        "The macOS osascript utility is required to update VS Code settings."

    local settings_dir="$HOME/Library/Application Support/Code/User"
    local settings_path="$settings_dir/settings.json"
    local intellisense_mode="macos-gcc-arm64"

    mkdir -p "$settings_dir"

    /usr/bin/env \
    GPP_BIN="$GPP_BIN" \
    INTELLISENSE_MODE="$intellisense_mode" \
    CPP_STANDARD="$CPP_STANDARD" \
    C_STANDARD="$C_STANDARD" \
    SETTINGS_PATH="$settings_path" \
    /usr/bin/osascript -l JavaScript <<'JXA'
ObjC.import("Foundation");

const environment = $.NSProcessInfo.processInfo.environment;
const settingsPath = ObjC.unwrap(environment.objectForKey("SETTINGS_PATH"));
const fileManager = $.NSFileManager.defaultManager;
const linkError = Ref();
const linkDestinationValue = fileManager.destinationOfSymbolicLinkAtPathError(
    settingsPath,
    linkError
);
const linkDestination = linkDestinationValue ? ObjC.unwrap(linkDestinationValue) : null;
let writePath = settingsPath;
if (linkDestination) {
    if (linkDestination.startsWith("/")) {
        writePath = linkDestination;
    } else {
        const parentPath = ObjC.unwrap($(settingsPath).stringByDeletingLastPathComponent);
        const combinedPath = ObjC.unwrap(
            $(parentPath).stringByAppendingPathComponent(linkDestination)
        );
        writePath = ObjC.unwrap($(combinedPath).stringByStandardizingPath);
    }
}
const pathExists = fileManager.fileExistsAtPath(writePath);
let settings = {};

if (pathExists) {
    const readError = Ref();
    const contents = $.NSString.stringWithContentsOfFileEncodingError(
        writePath,
        $.NSUTF8StringEncoding,
        readError
    );
    if (!contents) {
        throw new Error(
            `Could not read VS Code settings at ${settingsPath}: ` +
            ObjC.unwrap(readError[0].localizedDescription)
        );
    }

    const text = ObjC.unwrap(contents).replace(/^\uFEFF/, "");
    try {
        settings = JSON.parse(text);
    } catch (error) {
        throw new Error(
            `VS Code settings at ${settingsPath} contain JSON comments or invalid JSON: ${error.message}`
        );
    }
    if (!settings || Array.isArray(settings) || typeof settings !== "object") {
        throw new Error(`VS Code settings at ${settingsPath} must contain a JSON object.`);
    }
}

settings["C_Cpp.default.compilerPath"] = ObjC.unwrap(environment.objectForKey("GPP_BIN"));
settings["C_Cpp.default.intelliSenseMode"] = ObjC.unwrap(environment.objectForKey("INTELLISENSE_MODE"));
settings["C_Cpp.default.cppStandard"] = ObjC.unwrap(environment.objectForKey("CPP_STANDARD"));
settings["C_Cpp.default.cStandard"] = ObjC.unwrap(environment.objectForKey("C_STANDARD"));

const writeError = Ref();
const wroteSettings = $(JSON.stringify(settings, null, 4) + "\n")
    .writeToFileAtomicallyEncodingError(
        writePath,
        true,
        $.NSUTF8StringEncoding,
        writeError
    );
if (!wroteSettings) {
    throw new Error(
        `Could not write VS Code settings at ${settingsPath}: ` +
        ObjC.unwrap(writeError[0].localizedDescription)
    );
}
JXA

    log "Configured global VS Code GCC IntelliSense settings: $settings_path"
}

main() {
    require_macos
    require_apple_silicon
    install_homebrew
    install_vscode
    install_gcc
    set_vscode_cpp_defaults

    printf '\n\033[32mGCC is installed and VS Code is configured for C++.\033[0m\n'
    printf 'Compiler: %s\n' "$GPP_BIN"
    run "$GPP_BIN" --version
    printf 'Compile with: %q main.cpp -std=%s -Wall -Wextra -o main\n' \
        "$GPP_BIN" "$CPP_STANDARD"
}

main "$@"
