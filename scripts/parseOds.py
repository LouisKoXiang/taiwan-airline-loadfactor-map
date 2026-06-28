#!/usr/bin/env python3
"""
解析民航局 ODS 36 系列工作表 → monthlyAirlineRoutes.json

用法：
  單檔模式（新增或更新單月份）：
    python scripts/parseOds.py src/data/115年4月_1752_144902.ods

  全量重建模式（重新解析 src/data/ 下所有 ODS）：
    python scripts/parseOds.py --all
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from odf.opendocument import load
from odf.table import Table, TableRow, TableCell
from odf.text import P

# ── 出發機場對應 ──────────────────────────────────────────────────────

SHEET_TO_AIRPORT = {
    '36-1': 'TPE',
    '36-2': 'KHH',
    '36-3': 'TSA',
    '36-4': 'RMQ',
}

# ── 航空公司縮寫對應（只保留四雄） ────────────────────────────────────

AIRLINE_NAME_MAP = {
    '中華':     ('中華航空', 'CI'),
    '長榮':     ('長榮航空', 'BR'),
    '星宇':     ('星宇航空', 'JX'),
    '台灣虎航': ('台灣虎航', 'IT'),
}
TARGET_ABBREVS = set(AIRLINE_NAME_MAP.keys())

# ── 中文航點名稱 → (IATA 代碼, 國家/地區) ────────────────────────────

DEST_MAP = {
    # ── 日本 ──
    '大阪':       ('KIX', '日本'),
    '東京成田':   ('NRT', '日本'),
    '東京羽田':   ('HND', '日本'),
    '福岡':       ('FUK', '日本'),
    '沖繩':       ('OKA', '日本'),
    '仙台':       ('SDJ', '日本'),
    '札幌':       ('CTS', '日本'),
    '名古屋':     ('NGO', '日本'),
    '神戶':       ('UKB', '日本'),
    '廣島':       ('HIJ', '日本'),
    '熊本':       ('KMJ', '日本'),
    '富山':       ('TOY', '日本'),
    '鹿兒島':     ('KOJ', '日本'),
    '小松':       ('KMQ', '日本'),
    '大分':       ('OIT', '日本'),
    '佐賀':       ('HSG', '日本'),
    '岡山':       ('OKJ', '日本'),
    '高知':       ('KCZ', '日本'),
    '松山':       ('MYJ', '日本'),
    '高松':       ('TAK', '日本'),
    '花卷':       ('HNA', '日本'),
    '秋田':       ('AXT', '日本'),
    '新潟':       ('KIJ', '日本'),
    '函館':       ('HKD', '日本'),
    '下地島':     ('MMY', '日本'),
    '宮崎':       ('KMI', '日本'),
    '米子':       ('YGJ', '日本'),
    '福島':       ('FKS', '日本'),
    '石垣島':     ('ISG', '日本'),
    '青森':       ('AOJ', '日本'),
    '靜岡':       ('FSZ', '日本'),
    '旭川':       ('AKJ', '日本'),
    '茨城':       ('IBR', '日本'),
    # ── 韓國 ──
    '首爾仁川':   ('ICN', '韓國'),
    '首爾金浦':   ('GMP', '韓國'),
    '釜山':       ('PUS', '韓國'),
    '濟州':       ('CJU', '韓國'),
    '大邱':       ('TAE', '韓國'),
    # ── 中國 ──
    '上海浦東':   ('PVG', '中國'),
    '上海虹橋':   ('SHA', '中國'),
    '北京':       ('PEK', '中國'),
    '廣州':       ('CAN', '中國'),
    '深圳':       ('SZX', '中國'),
    '成都天府':   ('TFU', '中國'),
    '杭州':       ('HGH', '中國'),
    '重慶':       ('CKG', '中國'),
    # ── 香港 / 澳門 ──
    '香港':       ('HKG', '香港'),
    '澳門':       ('MFM', '澳門'),
    # ── 東南亞 ──
    '曼谷蘇凡納布': ('BKK', '泰國'),
    '曼谷廊曼':   ('DMK', '泰國'),
    '清邁':       ('CNX', '泰國'),
    '普吉':       ('HKT', '泰國'),
    '河內':       ('HAN', '越南'),
    '胡志明市':   ('SGN', '越南'),
    '峴港':       ('DAD', '越南'),
    '富國':       ('PQC', '越南'),
    '富國島':     ('PQC', '越南'),
    '榮市':       ('VII', '越南'),
    '新加坡':     ('SIN', '新加坡'),
    '吉隆坡':     ('KUL', '馬來西亞'),
    '檳城':       ('PEN', '馬來西亞'),
    '馬尼拉':     ('MNL', '菲律賓'),
    '宿霧':       ('CEB', '菲律賓'),
    '克拉克':     ('CRK', '菲律賓'),
    '雅加達':     ('CGK', '印尼'),
    '峇里島':     ('DPS', '印尼'),
    '金邊':       ('PNH', '柬埔寨'),
    # ── 大洋洲 ──
    '雪梨':       ('SYD', '澳洲'),
    '墨爾本':     ('MEL', '澳洲'),
    '布里斯本':   ('BNE', '澳洲'),
    # ── 太平洋 ──
    '帛琉':       ('ROR', '帛琉'),
    '關島':       ('GUM', '關島'),
    # ── 北美 ──
    '洛杉磯':     ('LAX', '美國'),
    '舊金山':     ('SFO', '美國'),
    '西雅圖':     ('SEA', '美國'),
    '芝加哥':     ('ORD', '美國'),
    '紐約':       ('JFK', '美國'),
    '達拉斯':     ('DFW', '美國'),
    '休士頓':     ('IAH', '美國'),
    '安大略':     ('ONT', '美國'),
    '鳳凰城':     ('PHX', '美國'),
    '溫哥華':     ('YVR', '加拿大'),
    '多倫多':     ('YYZ', '加拿大'),
    # ── 歐洲 ──
    '倫敦希斯洛': ('LHR', '英國'),
    '巴黎':       ('CDG', '法國'),
    '法蘭克福':   ('FRA', '德國'),
    '慕尼黑':     ('MUC', '德國'),
    '米蘭':       ('MXP', '義大利'),
    '羅馬':       ('FCO', '義大利'),
    '維也納':     ('VIE', '奧地利'),
    '阿姆斯特丹': ('AMS', '荷蘭'),
    '布拉格':     ('PRG', '捷克'),
}

# ── 月份排序工具 ──────────────────────────────────────────────────────

def month_sort_key(month_str: str) -> tuple[int, int]:
    """'114年10月' → (114, 10)，確保多位數月份（10、11、12）正確排序。"""
    m = re.match(r'(\d+)年(\d+)月', month_str)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return (0, 0)

def sort_months(months: list[str]) -> list[str]:
    """依民國年、月份數值排序月份字串清單。"""
    return sorted(months, key=month_sort_key)

# ── ODS 儲存格工具 ────────────────────────────────────────────────────

def cell_text(cell) -> str:
    ps = cell.getElementsByType(P)
    return ' '.join(str(p) for p in ps).strip() if ps else ''

def parse_num(s: str) -> float:
    """'1,234.5' → 1234.5；解析失敗時回傳 0.0。"""
    try:
        return float(s.replace(',', ''))
    except (ValueError, AttributeError):
        return 0.0

def get_row_values(row, n: int = 16) -> list[str]:
    """展開 numberColumnsRepeated 後取前 n 欄。"""
    vals: list[str] = []
    for cell in row.getElementsByType(TableCell):
        repeat = int(cell.getAttribute('numbercolumnsrepeated') or 1)
        v = cell_text(cell)
        for _ in range(min(repeat, 30)):
            vals.append(v)
            if len(vals) >= n:
                return vals
    return vals + [''] * (n - len(vals))

# ── 月份從檔名推斷 ────────────────────────────────────────────────────

def infer_month(path: str) -> str:
    """'115年4月_1752_144902.ods' → '115年4月'"""
    name = Path(path).stem
    m = re.match(r'(\d+年\d+月)', name)
    return m.group(1) if m else name

# ── 工作表解析 ────────────────────────────────────────────────────────

def parse_sheet(
    sheet,
    origin_code: str,
    month: str,
    unknown_dests: set[str],
) -> list[dict]:
    """解析單一工作表，回傳航線資料清單；未知航點加入 unknown_dests 集合。"""
    records: list[dict] = []
    current_dest_name = ''
    rows = sheet.getElementsByType(TableRow)

    for row in rows:
        vals = get_row_values(row)

        if not any(vals):
            continue

        # 航點小計行：col0 空、col1 有中文、col2 空
        if not vals[0] and vals[1] and not vals[2]:
            current_dest_name = vals[1].strip()
            continue

        # 航空公司明細行：col0 為數字、col2 在 TARGET_ABBREVS
        if vals[0].isdigit() and vals[2] in TARGET_ABBREVS:
            airline_abbrev = vals[2]
            full_name, code = AIRLINE_NAME_MAP[airline_abbrev]

            dest_info = DEST_MAP.get(current_dest_name)
            if dest_info is None:
                unknown_dests.add(current_dest_name)
                continue

            dest_code, country = dest_info

            records.append({
                'month':                    month,
                'originAirportCode':        origin_code,
                'destinationAirportCode':   dest_code,
                'destinationCityName':      current_dest_name,
                'destinationCountry':       country,
                'airlineName':              full_name,
                'airlineCode':              code,
                'flightCount':              int(parse_num(vals[3])),
                'seatCount':                int(parse_num(vals[4])),
                'passengerCount':           int(parse_num(vals[5])),
                'loadFactor':               round(parse_num(vals[6]), 1),
                'inboundPassengerCount':    int(parse_num(vals[9])),
                'outboundPassengerCount':   int(parse_num(vals[13])),
            })

    return records

def parse_ods(ods_path: str) -> tuple[list[dict], set[str]]:
    """解析 ODS 檔案，回傳 (records, unknown_dests)。"""
    month = infer_month(ods_path)
    doc = load(ods_path)
    sheets = doc.spreadsheet.getElementsByType(Table)
    sheet_map = {s.getAttribute('name'): s for s in sheets}

    all_records: list[dict] = []
    unknown_dests: set[str] = set()

    for sheet_name, origin_code in SHEET_TO_AIRPORT.items():
        if sheet_name not in sheet_map:
            print(f'  [略過] 工作表 {sheet_name} 不存在')
            continue
        recs = parse_sheet(sheet_map[sheet_name], origin_code, month, unknown_dests)
        print(f'  {sheet_name} ({origin_code}): {len(recs)} 筆')
        all_records.extend(recs)

    return all_records, unknown_dests

# ── 資料品質檢查 ──────────────────────────────────────────────────────

def quality_report(all_records: list[dict], all_unknown: dict[str, set[str]]) -> None:
    """輸出資料品質摘要報告。"""
    print('\n' + '═' * 60)
    print('  資料品質報告')
    print('═' * 60)

    # 每月份筆數
    month_counts: dict[str, int] = defaultdict(int)
    for r in all_records:
        month_counts[r['month']] += 1
    print('\n每月份筆數：')
    for m in sort_months(list(month_counts)):
        print(f'  {m}：{month_counts[m]} 筆')

    # 每家航空公司總筆數
    airline_counts: dict[str, int] = defaultdict(int)
    for r in all_records:
        airline_counts[r['airlineName']] += 1
    print('\n各航空公司總筆數：')
    for name, cnt in sorted(airline_counts.items()):
        print(f'  {name}：{cnt} 筆')

    # 座位數為 0
    zero_seat = [r for r in all_records if r['seatCount'] == 0]
    print(f'\n座位數 = 0：{len(zero_seat)} 筆', end='')
    if zero_seat:
        samples = zero_seat[:3]
        print('（範例：' + '、'.join(f"{r['month']} {r['airlineName']} {r['originAirportCode']}→{r['destinationAirportCode']}" for r in samples) + '）')
    else:
        print()

    # 載客率超過 100%
    over_100 = [r for r in all_records if r['loadFactor'] > 100]
    print(f'\n載客率 > 100%：{len(over_100)} 筆', end='')
    if over_100:
        samples = over_100[:5]
        print('（原始資料，不做修正）：')
        for r in samples:
            print(f'    {r["month"]} {r["airlineName"]} {r["originAirportCode"]}→{r["destinationAirportCode"]} {r["loadFactor"]}%')
    else:
        print()

    # 載客率與人數/座位計算不一致（差異 > 2pp，且 seatCount > 0）
    discrepancies = []
    for r in all_records:
        if r['seatCount'] > 0:
            calc_lf = r['passengerCount'] / r['seatCount'] * 100
            if abs(calc_lf - r['loadFactor']) > 2.0:
                discrepancies.append((r, calc_lf))
    print(f'\n載客率與計算值差異 > 2pp：{len(discrepancies)} 筆', end='')
    if discrepancies:
        print('（範例）：')
        for r, calc in discrepancies[:5]:
            print(f'    {r["month"]} {r["airlineName"]} {r["originAirportCode"]}→{r["destinationAirportCode"]} '
                  f'原始={r["loadFactor"]}% 計算={calc:.1f}%')
    else:
        print()

    # 未知航點彙總
    all_unknown_flat: set[str] = set()
    for s in all_unknown.values():
        all_unknown_flat.update(s)
    print(f'\n未知航點（已跳過）：{len(all_unknown_flat)} 個')
    if all_unknown_flat:
        for dest in sorted(all_unknown_flat):
            months_with = [m for m, s in all_unknown.items() if dest in s]
            print(f'  「{dest}」出現於：{", ".join(sort_months(months_with))}')

    print('\n' + '═' * 60)
    print(f'  總計：{len(all_records)} 筆記錄')
    print('═' * 60 + '\n')

# ── JSON 寫出（按月份排序） ───────────────────────────────────────────

def write_json(records: list[dict], output_path: str) -> None:
    """將記錄按月份排序後寫出 JSON。"""
    sorted_records = sorted(records, key=lambda r: month_sort_key(r['month']))
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_records, f, ensure_ascii=False, indent=2)

# ── 全量重建模式 ─────────────────────────────────────────────────────

def rebuild_all(data_dir: str, output_path: str) -> None:
    """掃描 data_dir 下所有 ODS 檔，全量重建 JSON。"""
    ods_files = sorted(Path(data_dir).glob('*.ods'), key=lambda p: month_sort_key(infer_month(str(p))))

    if not ods_files:
        print(f'[錯誤] {data_dir} 下找不到任何 .ods 檔案')
        sys.exit(1)

    print(f'全量重建模式：共找到 {len(ods_files)} 個 ODS 檔案\n')

    all_records: list[dict] = []
    all_unknown: dict[str, set[str]] = {}

    for ods_path in ods_files:
        month = infer_month(str(ods_path))
        print(f'解析 {ods_path.name}（{month}）')
        recs, unknown = parse_ods(str(ods_path))
        print(f'  小計：{len(recs)} 筆\n')
        all_records.extend(recs)
        if unknown:
            all_unknown[month] = unknown

    write_json(all_records, output_path)
    print(f'已寫出：{output_path}')

    quality_report(all_records, all_unknown)

# ── 單檔更新模式 ─────────────────────────────────────────────────────

def update_single(ods_file: str, output_path: str) -> None:
    """解析單一 ODS 檔，移除同月份舊資料後寫入新資料。"""
    month = infer_month(ods_file)
    print(f'解析：{ods_file}（{month}）')
    new_records, unknown = parse_ods(ods_file)
    print(f'解析完成：{len(new_records)} 筆\n')

    # 讀取現有 JSON，移除同月份舊資料
    out = Path(output_path)
    existing: list[dict] = []
    if out.exists():
        with open(out, 'r', encoding='utf-8') as f:
            existing = json.load(f)

    kept = [r for r in existing if r['month'] != month]
    removed = len(existing) - len(kept)
    if removed:
        print(f'已移除 {month} 舊資料：{removed} 筆')

    merged = kept + new_records
    write_json(merged, output_path)
    print(f'已寫出：{output_path}')
    print(f'  新增：{len(new_records)} 筆 / 總計：{len(merged)} 筆')

    all_unknown = {month: unknown} if unknown else {}
    quality_report(merged, all_unknown)

# ── 程式進入點 ────────────────────────────────────────────────────────

if __name__ == '__main__':
    output_file = 'src/data/monthlyAirlineRoutes.json'
    data_dir    = 'src/data'

    if len(sys.argv) >= 2 and sys.argv[1] == '--all':
        rebuild_all(data_dir, output_file)
    elif len(sys.argv) >= 2:
        update_single(sys.argv[1], output_file)
    else:
        print('用法：')
        print('  單檔模式：python scripts/parseOds.py src/data/115年4月_xxxx.ods')
        print('  全量重建：python scripts/parseOds.py --all')
        sys.exit(1)
