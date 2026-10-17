"""公園区域 TopoJSON(jaffpota-annotated-vN.json)の版管理。

最新版はディスク上のファイルから決める。ファイル名の版が CDN/ブラウザーキャッシュの無効化を兼ねるため、
更新は「次の版番号の新ファイルを置き、index.html の参照を差し替える」形で行う。

    python jaffpota_release.py                   # 現在の最新版と参照状況を表示
    python jaffpota_release.py bump new.json     # new.json を次の版として配置し、参照を更新してテストを実行
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JSON_DIR = ROOT / "public/common/json"
HTML = ROOT / "public/myact/index.html"
PATTERN = re.compile(r"jaffpota-annotated-v(\d+)\.json")


def versions():
    return sorted(int(m.group(1)) for p in JSON_DIR.glob("jaffpota-annotated-v*.json") if (m := PATTERN.fullmatch(p.name)))


def latest_version():
    return versions()[-1]


def path_of(version):
    return JSON_DIR / f"jaffpota-annotated-v{version}.json"


def latest_path():
    return path_of(latest_version())


def referenced_version(html=HTML):
    found = {int(m.group(1)) for m in PATTERN.finditer(html.read_text(encoding="utf-8"))}
    return found


def bump(src):
    src = Path(src)
    if not src.is_file():
        sys.exit(f"ファイルが見つかりません: {src}")
    new = latest_version() + 1
    shutil.copyfile(src, path_of(new))
    text = HTML.read_text(encoding="utf-8")
    HTML.write_text(PATTERN.sub(f"jaffpota-annotated-v{new}.json", text), encoding="utf-8")
    print(f"v{new} を配置し、{HTML.relative_to(ROOT)} の参照を更新しました。旧版 v{new - 1} はロールバック用に残します。")
    return subprocess.call([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", ".", "-v"], cwd=ROOT)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "bump":
        sys.exit(bump(sys.argv[2]))
    if len(sys.argv) == 1:
        print(f"最新版: v{latest_version()}  index.html の参照: {sorted(referenced_version())}")
        sys.exit(0)
    sys.exit(__doc__)
