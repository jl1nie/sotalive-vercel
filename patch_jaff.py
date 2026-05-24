#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///
"""
JAFF/POTA TopoJSON patcher

JSONの各エントリをAPIで照合し、無効・未登録のものを対話形式で修正する。

Usage:
  uv run patch_jaff.py [--api URL] [--dry-run]

Examples:
  uv run patch_jaff.py
  uv run patch_jaff.py --api http://localhost:8080
  uv run patch_jaff.py --dry-run
"""

import json
import sys
import argparse
import urllib.request
import urllib.error

JSON_PATH = "public/common/json/jaffpota-annotated-v22.json"
DEFAULT_API = "https://sotaapp2.sotalive.net"


_cache = {}


def query_park(api_url, code):
    """パークコードでAPIを照合。見つからなければNone。結果をキャッシュ。"""
    if code in _cache:
        return _cache[code]
    url = f"{api_url}/api/v2/pota/parks/{urllib.parse.quote(code)}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            result = json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            result = None
        else:
            raise
    except Exception as e:
        print(f"  [warn] API error for {code}: {e}", file=sys.stderr)
        result = None
    _cache[code] = result
    return result


def query_park_combo(api_url, pota_code, jaff_code):
    """POTA+JAFF複合キーで照合。POTAで見つかりJAFFも一致すればそれを返す。
    JAFFが不一致の場合はJAFFコードでも検索し、POTAが一致するレコードを優先する。"""
    park = query_park(api_url, pota_code)
    if park and (not jaff_code or park.get("wwffCode", "") == jaff_code):
        return park
    if jaff_code:
        park2 = query_park(api_url, jaff_code)
        if park2 and normalize_pota(park2.get("potaCode", "")) == pota_code:
            return park2
    return park


def normalize_pota(pota):
    """JA-XXXX → JP-XXXX"""
    if pota.startswith("JA-"):
        return "JP-" + pota[3:]
    return pota


import urllib.parse


def main():
    parser = argparse.ArgumentParser(description="Patch JAFF annotation TopoJSON interactively")
    parser.add_argument("--api", default=DEFAULT_API, help=f"Backend API URL (default: {DEFAULT_API})")
    parser.add_argument("--dry-run", action="store_true", help="確認のみ、ファイルは書き換えない")
    args = parser.parse_args()

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    geometries = data["objects"]["jaffpota"]["geometries"]
    print(f"Loaded {len(geometries)} geometries from {JSON_PATH}")
    print(f"API: {args.api}\n")

    changes = []  # (geom, new_props)
    total = len(geometries)
    queried = 0
    unique_codes = set()

    for i, geom in enumerate(geometries, 1):
        props = geom["properties"]
        uid = props.get("UID", "?")
        old_pota = props.get("POTA", "")
        old_jaff = props.get("JAFF", "")
        old_name = props.get("NAME", "")

        if not old_pota:
            continue

        new_pota = normalize_pota(old_pota)
        is_new = new_pota not in _cache
        if is_new:
            unique_codes.add(new_pota)
            queried += 1
        print(f"\r[{i}/{total}] API:{queried}件照会済 ", end="", flush=True)
        park = query_park_combo(args.api, new_pota, old_jaff)

        # 問題なし: DBに存在してアクティブ
        if park is not None and not park.get("parkInactive", False):
            continue

        # 要確認: DBに存在しないか非表示
        print(f"\n{'─'*60}")
        print(f"UID {uid}  現在: POTA={old_pota}  JAFF={old_jaff}")
        print(f"  NAME={old_name}")

        if park is None:
            print(f"  → DBに {new_pota} が存在しない")
        elif park.get("parkInactive"):
            print(f"  → {new_pota} は非表示 (parkInactive)")

        print()
        print("  新しいPOTAコードを入力 (Enterでスキップ、qで終了):")
        try:
            answer = input("  > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n中断")
            break

        if answer == "q":
            print("終了")
            break
        if not answer:
            print("  スキップ")
            continue

        new_park = query_park(args.api, answer)
        if new_park:
            new_props = {
                "POTA": new_park.get("potaCode", answer),
                "JAFF": new_park.get("wwffCode", ""),
                "NAME": new_park.get("parkNameJ", ""),
            }
            print(f"  → POTA={new_props['POTA']}  JAFF={new_props['JAFF']}  NAME={new_props['NAME']}")
        else:
            print(f"  [warn] {answer} がDBにない。そのまま設定。")
            new_props = {"POTA": answer, "JAFF": old_jaff, "NAME": old_name}

        changes.append((props, new_props))

    print(f"\n{'='*60}")
    print(f"変更: {len(changes)} 件")

    if not changes:
        print("変更なし。")
        return

    for props, new_props in changes:
        uid = props.get("UID", "?")
        print(f"  UID {uid}: {props.get('POTA')} → {new_props['POTA']}  JAFF: {props.get('JAFF')} → {new_props['JAFF']}")

    if args.dry_run:
        print("\n[dry-run] ファイルは更新しない。")
        return

    confirm = input("\nJSONファイルを更新しますか？ [y/N] ").strip().lower()
    if confirm != "y":
        print("キャンセル。")
        return

    for props, new_props in changes:
        props.update(new_props)

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"✓ {JSON_PATH} を更新しました。")
    print("次: git diff → git add → git commit → git push")


if __name__ == "__main__":
    main()
