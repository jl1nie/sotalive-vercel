"""最新版 jaffpota-annotated-vN.json の検証。標準ライブラリのみ。

版に依存しない検査(書式・属性・UID・arc・index.html の参照・DB照合)と、v23 固有の検査(件数・新規公園)に分かれる。

    python -m unittest tests.test_jaffpota -v
    JAFFPOTA_API=https://sotaapp2.sotalive.net python -m unittest tests.test_jaffpota -v   # DB照合も実行
"""
import json
import os
import unittest
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import jaffpota_release as rel  # noqa: E402

PATH = rel.latest_path()
V23 = rel.latest_version() == 23
PROPS = ["JAFF", "NAME", "PID", "POTA", "UID"]
NEW_PARKS = {
    "JP-0030": ("JAFF-0090", "030", "屋久島国立公園"),
    "JP-0032": ("JAFF-0097", "032", "やんばる国立公園"),
    "JP-0033": ("JAFF-0092", "033", "慶良間諸島国立公園"),
}
REMOVED = {"JP-0104"}  # 日高山脈襟裳国定公園: 日高山脈襟裳十勝国立公園(JP-2107)へ格上げ、DBでも inactive


def arcs_of(g):
    polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
    return [[r for r in poly] for poly in polys]


class TestJaffpotaV23(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = PATH.read_text(encoding="utf-8")
        cls.d = json.loads(cls.raw)
        cls.geoms = cls.d["objects"]["jaffpota"]["geometries"]

    def test_format(self):
        self.assertEqual(self.d["type"], "Topology")
        self.assertEqual(list(self.d["objects"]), ["jaffpota"])
        self.assertEqual(self.d["objects"]["jaffpota"]["type"], "GeometryCollection")
        self.assertTrue(self.raw.endswith("}\n") and not self.raw.endswith("\n\n"))
        dumped = json.dumps(self.d, ensure_ascii=False, separators=(",", ":")) + "\n"
        self.assertEqual(dumped, self.raw)  # 空白なし・非ASCIIエスケープなし

    @unittest.skipUnless(V23, "v23 固有の検査")
    def test_counts(self):
        self.assertEqual(len(self.geoms), 1439)
        self.assertEqual({g["type"] for g in self.geoms}, {"Polygon", "MultiPolygon"})
        pota = {g["properties"]["POTA"] for g in self.geoms}
        self.assertEqual(len(pota), 395)
        national = {g["properties"]["POTA"] for g in self.geoms if g["properties"]["NAME"].endswith("国立公園")}
        self.assertEqual(len(national), 35)

    def test_properties(self):
        for g in self.geoms:
            self.assertEqual(sorted(g["properties"]), PROPS)
            for k in PROPS:
                v = g["properties"][k]
                self.assertIsInstance(v, str)
                self.assertTrue(v, f"{k} が空: {g['properties']}")

    def test_uid_sequential(self):
        self.assertEqual([g["properties"]["UID"] for g in self.geoms], [str(i) for i in range(1, len(self.geoms) + 1)])

    @unittest.skipUnless(V23, "v23 固有の検査")
    def test_new_national_parks(self):
        for pota, (jaff, pid, name) in NEW_PARKS.items():
            gs = [g["properties"] for g in self.geoms if g["properties"]["POTA"] == pota]
            self.assertTrue(gs, pota)
            for p in gs:
                self.assertEqual((p["JAFF"], p["PID"], p["NAME"]), (jaff, pid, name))
        # 霧島錦江湾と屋久島は別の公園
        self.assertTrue(any(g["properties"]["POTA"] == "JP-0029" for g in self.geoms))

    def test_index_html_references_latest(self):
        self.assertEqual(rel.referenced_version(), {rel.latest_version()}, "index.html の参照が最新版とずれている")

    def test_removed_pota_absent(self):
        present = {g["properties"]["POTA"] for g in self.geoms}
        self.assertFalse(present & REMOVED)
        self.assertIn("JP-2107", present)

    def test_arcs_valid_and_all_used(self):
        n = len(self.d["arcs"])
        used = set()
        for g in self.geoms:
            for poly in arcs_of(g):
                self.assertTrue(poly, g["properties"])
                for ring in poly:
                    self.assertTrue(ring)
                    for i in ring:
                        j = i if i >= 0 else ~i
                        self.assertLess(j, n)
                        used.add(j)
        self.assertEqual(len(used), n, "未参照の arc がある")
        for a in self.d["arcs"]:
            self.assertGreaterEqual(len(a), 4)  # 閉じたリングは4点以上

    @unittest.skipUnless(os.environ.get("JAFFPOTA_API"), "JAFFPOTA_API 未設定のため DB 照合をスキップ")
    def test_pota_codes_active_in_db(self):
        api = os.environ["JAFFPOTA_API"].rstrip("/")
        codes = sorted({g["properties"]["POTA"] for g in self.geoms})

        def get(code):
            url = f"{api}/api/v2/pota/parks/{urllib.parse.quote(code)}"
            try:
                with urllib.request.urlopen(url, timeout=15) as r:
                    return code, json.loads(r.read())
            except urllib.error.HTTPError as e:
                return code, e.code

        with ThreadPoolExecutor(8) as ex:
            res = dict(ex.map(get, codes))
        missing = [c for c, v in res.items() if not isinstance(v, dict)]
        inactive = [c for c, v in res.items() if isinstance(v, dict) and v.get("parkInactive")]
        self.assertEqual(missing, [], "DBに存在しない POTA")
        self.assertEqual(inactive, [], "DBで inactive の POTA")


if __name__ == "__main__":
    unittest.main()
