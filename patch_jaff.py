#!/usr/bin/env python3
"""
JAFF/POTA TopoJSON patcher

JSONの各エントリをAPIで照合し、無効・未登録のものを対話形式で修正する。

Usage:
  python3 patch_jaff.py [--api URL] [--dry-run]

Examples:
  python3 patch_jaff.py
  python3 patch_jaff.py --api http://localhost:8080
  python3 patch_jaff.py --dry-run
"""

import json
import sys
import argparse
import urllib.request
import urllib.error

JSON_PATH = "public/common/json/jaffpota-annotated-v22.json"
DEFAULT_API = "https://sotaapp2.fly.dev"


def query_park(api_url, code):
    """パークコードでAPIを照合。見つからなければNone。"""
    url = f"{api_url}/api/v2/pota/parks/{urllib.parse.quote(code)}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except Exception as e:
        print(f"  [warn] API error for {code}: {e}", file=sys.stderr)
        return None


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

    for geom in geometries:
        props = geom["properties"]
        uid = props.get("UID", "?")
        old_pota = props.get("POTA", "")
        old_jaff = props.get("JAFF", "")
        old_name = props.get("NAME", "")

        if not old_pota:
            continue

        new_pota = normalize_pota(old_pota)
        park = query_park(args.api, new_pota)

        # 問題なし: アクティブでPOTA/JAFF/NAMEが一致
        if (
            park is not None
            and not park.get("parkInactive", False)
            and old_pota == park.get("potaCode", new_pota)
            and old_jaff == park.get("wwffCode", old_jaff)
            and old_name == park.get("parkNameJ", old_name)
        ):
            continue

        # プレフィックス正規化のみ(JA-→JP-)で他は一致
        if (
            park is not None
            and not park.get("parkInactive", False)
            and old_pota != new_pota
            and old_pota.replace("JA-", "JP-") == park.get("potaCode", "")
            and old_jaff == park.get("wwffCode", old_jaff)
            and old_name == park.get("parkNameJ", old_name)
        ):
            print(f"UID {uid:6s}: prefix fix {old_pota} → {new_pota}")
            changes.append((props, {"POTA": new_pota, "JAFF": old_jaff, "NAME": old_name}))
            continue

        # 要確認
        print(f"\n{'─'*60}")
        print(f"UID {uid}  現在: POTA={old_pota}  JAFF={old_jaff}")
        print(f"  NAME={old_name}")

        if park is None:
            print(f"  → DBに {new_pota} が存在しない")
        elif park.get("parkInactive"):
            print(f"  → {new_pota} は非表示 (parkInactive)")
            succ = park.get("successorPotaCode", "")
            if succ:
                print(f"     successorPotaCode = {succ}")
        else:
            db_jaff = park.get("wwffCode", "")
            db_name = park.get("parkNameJ", "")
            if old_jaff != db_jaff:
                print(f"  → JAFF不一致: JSON={old_jaff}  DB={db_jaff}")
            if old_name != db_name:
                print(f"  → NAME不一致: JSON={old_name}  DB={db_name}")

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
