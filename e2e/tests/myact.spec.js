// MyACT のリファクタ前後で同じ結果になることを確認する画面テスト(docs/myact-refactor-checklist.md の自動化部分)
const { test, expect } = require('@playwright/test');

const TRACKERS = /googletagmanager|google-analytics|sentry\.io|ads-twitter|bing\.com|facebook\.net|yahoo\.co\.jp|yimg\.jp|slim02|mieru-ca|mackerel\.io/;

// 起動時に呼ばれる API エンドポイント(リファクタ前の基準)
const BASELINE_API = [
  '/activation/aprs/track',
  '/propagation/geomag',
  '/search',
];
// prefs のキーのうち、同名の要素 ID が無いもの(スライダー等は別 ID を使う。基準)
const BASELINE_PREFS_WITHOUT_ELEMENT = ['spot_period', 'zoom_threshold'];

async function open(page, { cookies = [] } = {}) {
  const errors = [], apis = [], areaFetches = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route(TRACKERS, r => r.abort());
  await page.route('**/sotaapp2.sotalive.net/api/v2/**', route => {
    const u = new URL(route.request().url());
    const ep = u.pathname.replace('/api/v2', '');
    apis.push(ep);
    let body = [];
    if (ep === '/pota/parks/search') {
      const code = u.searchParams.get('pota_code');
      body = [{ potaCode: code, wwffCode: 'JAFF-TEST', parkName: 'Test', parkNameJ: 'テスト公園', parkInactive: false }];
    } else if (ep === '/propagation/geomag') {
      body = { date: '2026-10-17', aIndex: 10, kIndex: [0, 1, 2] };
    } else if (ep === '/activation/aprs/track') {
      body = { tracks: [] };
    } else if (ep === '/search') {
      body = { sota: [], pota: [], temples: [] };
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  page.on('request', r => { if (/jaffpota-annotated-v\d+\.json/.test(r.url())) areaFetches.push(r.url()); });
  if (cookies.length) await page.context().addCookies(cookies);
  await page.goto('/');
  await page.waitForFunction(() => window.map && window.geojson && Object.keys(geojson._layers).length > 0, null, { timeout: 30000 });
  return { errors, apis, areaFetches };
}

// 経緯度を画面座標にして、区域をクリックする
async function clickAt(page, lat, lng, button = 'left', zoom = 10) {
  await page.evaluate(([la, ln, z]) => { map.setView([la, ln], z, { animate: false }); }, [lat, lng, zoom]);
  await page.waitForTimeout(500);
  const pt = await page.evaluate(([la, ln]) => {
    const p = map.latLngToContainerPoint([la, ln]);
    const r = document.getElementById('map').getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, [lat, lng]);
  await page.mouse.click(pt.x, pt.y, { button });
}

const popupText = page => page.locator('.leaflet-popup-content').first().innerText({ timeout: 10000 });

test.describe('起動と区域', () => {
  test('M-3/C-1/C-3 エラーなく起動し、区域が1回だけ読まれる', async ({ page }) => {
    const { errors, areaFetches } = await open(page);
    expect(errors).toEqual([]);
    expect(areaFetches).toHaveLength(1);
    expect(areaFetches[0]).toMatch(/jaffpota-annotated-v\d+\.json$/);
    expect(await page.evaluate(() => Object.keys(geojson._layers).length)).toBe(1439);
  });

  test('C-2 起動時の API エンドポイントが基準と同じ', async ({ page }) => {
    const { apis } = await open(page);
    await page.waitForTimeout(2000);
    expect([...new Set(apis)].sort()).toEqual(BASELINE_API);
  });

  test('M-8 設定を開閉しても区域が重複しない', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => Object.keys(geojson._layers).length);
    for (let i = 0; i < 2; i++) {
      await page.locator('button[data-target="#modal-prefs"]').click();
      await page.locator('#modal-prefs .modal-footer button, #modal-prefs button.close').first().click();
      await page.waitForTimeout(500);
    }
    expect(await page.evaluate(() => Object.keys(geojson._layers).length)).toBe(before);
  });
});

test.describe('区域のクリック(M-4〜M-7)', () => {
  const cases = [
    ['屋久島 宮之浦岳', 30.3359, 130.5042, 'JP-0030', '屋久島国立公園'],
    ['桜島(霧島錦江湾)', 31.58, 130.65, 'JP-0029', '霧島錦江湾国立公園'],
    ['やんばる 与那覇岳', 26.7364, 128.2172, 'JP-0032', 'やんばる国立公園'],
    ['慶良間 座間味島', 26.2316, 127.3, 'JP-0033', '慶良間諸島国立公園'],
  ];
  for (const [name, lat, lng, pota, label] of cases) {
    test(`${name} → ${pota}`, async ({ page }) => {
      await open(page);
      await clickAt(page, lat, lng);
      const t = await popupText(page);
      expect(t).toContain(pota);
      expect(t).toContain(label);
    });
  }

  test('M-5 右クリックで JAFF(PID,UID) が出る', async ({ page }) => {
    await open(page);
    await clickAt(page, 30.3359, 130.5042, 'right');
    const t = await popupText(page);
    expect(t).toMatch(/JAFF-0090\(030,\d+\)/);
  });
});

test.describe('設定(R-1〜R-7)', () => {
  test('R-5 「自然公園の領域を表示」の設定は無い', async ({ page }) => {
    await open(page);
    expect(await page.locator('#display_area').count()).toBe(0);
    expect(await page.evaluate(() => 'display_area' in prefs)).toBe(false);
  });

  test('R-5 古い display_area Cookie が残っていても壊れない', async ({ page }) => {
    const { errors } = await open(page, { cookies: [{ name: 'display_area', value: 'false', url: 'http://localhost:4173' }] });
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => Object.keys(geojson._layers).length)).toBe(1439);
  });

  test('R-7 prefs のキーと要素 ID の対応が基準と同じ', async ({ page }) => {
    await open(page);
    const missing = await page.evaluate(() => Object.keys(prefs).filter(k => !document.getElementById(k)).sort());
    expect(missing).toEqual(BASELINE_PREFS_WITHOUT_ELEMENT);
  });

  test('R-2 チェックボックスの設定がリロード後も保持される', async ({ page }) => {
    await open(page);
    const ids = ['sota_ref', 'pota_ref', 'jaff_ref', 'aprs_track', 'popup_permanent', 'link_googlemap', 'display_mapcode'];
    await page.locator('button[data-target="#modal-prefs"]').click();
    await page.waitForSelector('#modal-prefs.show');
    const initial = {};
    for (const id of ids) {
      initial[id] = await page.locator('#' + id).isChecked();
      await page.locator('label[for="' + id + '"]').click(); // 反転
    }
    await page.evaluate(() => closePrefs());
    await page.reload();
    await page.waitForFunction(() => window.prefs);
    for (const id of ids) {
      expect(await page.evaluate(k => prefs[k], id), id).toBe(!initial[id]);
    }
  });

  test('R-6 Cookie なしの既定値', async ({ page }) => {
    await open(page);
    const d = await page.evaluate(() => ({ sota: prefs.sota_ref, pota: prefs.pota_ref, jaff: prefs.jaff_ref, aprs: prefs.aprs_track, perm: prefs.popup_permanent, mapcode: prefs.display_mapcode }));
    expect(d).toEqual({ sota: true, pota: true, jaff: true, aprs: true, perm: true, mapcode: false });
  });
});
