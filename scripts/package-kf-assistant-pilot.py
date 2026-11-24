# modified by jinlong.feng at 2026-11-20 KF助手浮窗试点交付
"""从完整工作区构建 KF 开发助手试点包。参数为新 ZIP 的目标路径。"""

import argparse
import hashlib
import os
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "devFront"

# modified by jinlong.feng at 2026-11-24 KF开发助手公开仓库交付
SOURCE_FILES = (
    "README.md", "AGENTS.md",
    "dev/agent/.env.example", "dev/agent/.gitignore", "dev/agent/README.md",
    "dev/agent/package.json", "dev/agent/package-lock.json",
    "devFront/.env.example", "devFront/.gitignore", "devFront/README.md",
    "devFront/package.json", "devFront/package-lock.json",
    "devFront/index.html", "devFront/assistant.html",
    "devFront/vite.config.js", "devFront/assistant-editor-proxy.js",
    "scripts/package-kf-assistant-pilot.py",
)
SOURCE_GLOBS = (
    "dev/agent/src/*.ts", "dev/agent/test/*.ts", "dev/agent/examples/*.js.txt",
    "dev/agent/runtime-observer/*.js", "dev/agent/runtime-observer/*.json",
    "devFront/src/**/*", "devFront/public/**/*", "devFront/preview-oem/**/*",
    "docs/**/*.md", "docs/**/*.json", "docs/audits/**/index-source.mjs",
    "docs/audits/**/replay-answer-routing.mjs",
    "docs/prototypes/**/index.html", "docs/prototypes/**/*.png",
    "kf-reference/README.md", "kf-reference/manifest.json",
    "kf-reference/**/*.js", "kf-reference/**/*.html", "kf-reference/**/*.json",
    "front/src/views/Main/RunningNodesManagerView/**/*.vue",
    "scripts/audit-kf-assistant-capabilities.mjs",
)
# end


def collect_files(dist):
    paths = {ROOT / name for name in SOURCE_FILES}
    for pattern in SOURCE_GLOBS:
        # modified by jinlong.feng at 2026-11-24 KF开发助手公开仓库交付
        paths.update(path for path in ROOT.glob(pattern) if path.is_file() and not any(part.startswith(".") for part in path.relative_to(ROOT).parts))
        # end
    files = {p.relative_to(ROOT).as_posix(): p for p in paths}
    for entry in ("index.html", "assistant.html", "kf-assistant-editor.js", "ace/worker-javascript.js", "favicon.ico"):
        files["devFront/dist/" + entry] = dist / entry
    for asset in (dist / "assets").rglob("*"):
        if asset.is_file():
            files["devFront/dist/" + asset.relative_to(dist).as_posix()] = asset
    expected_build = {p for p in dist.rglob("*") if p.is_file()}
    if expected_build.difference(files.values()):
        raise ValueError("构建目录含有清单以外的文件，请核对后更新交付范围")
    for name, path in files.items():
        if not path.is_file() or path.is_symlink() or any(part.startswith(".") and part not in (".env.example", ".gitignore") for part in Path(name).parts):
            raise ValueError("交付项缺失或路径不适合打包：" + name)
    return files


def build_archive(output):
    if output.exists():
        raise FileExistsError("目标已存在，请为新版本指定独立文件名：" + str(output))
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix=".kf-pilot-") as temp:
        stage = Path(temp)
        dist = stage / "dist"
        subprocess.run(
            ["node", str(FRONT / "node_modules/vite/bin/vite.js"), "build", "--outDir", str(dist)],
            cwd=FRONT, check=True,
            env={**os.environ, "VITE_KF_ASSISTANT_ENABLED": "true", "VITE_PROXY_DOMAIN": "/api"},
        )
        files = collect_files(dist)
        archive = stage / "pilot.zip"
        with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=6) as bundle:
            for name, path in sorted(files.items()):
                bundle.write(path, name)
        with ZipFile(archive) as bundle:
            if set(bundle.namelist()) != files.keys() or bundle.testzip() is not None:
                raise ValueError("ZIP 清单或 CRC 校验失败")
        # Both paths share a filesystem. An existing release also survives concurrent builds.
        os.link(archive, output)
    print(f"{output.name}  ·  {len(files)} files  ·  SHA-256 {hashlib.sha256(output.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("output", type=Path, help="新试点 ZIP 的输出路径")
    build_archive(cli.parse_args().output.resolve())
# end
