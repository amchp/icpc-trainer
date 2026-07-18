import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Introduction installer assets", () => {
  it("bundles the reviewed Windows toolchain markers", async () => {
    const source = await readFile("public/setup/install-cpp-vscode.ps1", "utf8");
    expect(source).toContain("Microsoft.VisualStudioCode");
    expect(source).toContain("MSYS2.MSYS2");
    expect(source).toContain("mingw-w64-ucrt-x86_64-gcc");
    expect(source).toContain("ms-vscode.cpptools");
    expect(source).not.toContain('"C_Cpp.default.cppStandard"');
    expect(source.match(/\$LASTEXITCODE -ne 0/g)).toHaveLength(7);
    expect(source.indexOf("& $compiler --version")).toBeLessThan(source.indexOf("C++ setup complete"));
  });

  it("guards Apple Silicon and bundles the macOS toolchain markers", async () => {
    const source = await readFile("public/setup/install-cpp-vscode-macos.sh", "utf8");
    expect(source).toContain('"$(uname -m)" != "arm64"');
    expect(source).toContain("brew install gcc");
    expect(source).toContain("ms-vscode.cpptools");
    expect(source).not.toContain('"C_Cpp.default.cppStandard"');
    expect(source).toContain('"C_Cpp.default.intelliSenseMode": "macos-gcc-arm64"');
  });
});
