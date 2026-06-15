#!/usr/bin/env python3
"""
解析民航局 ODS 36 系列工作表 → monthlyAirlineRoutes.json
使用方式：python3 scripts/parseOds.py [path/to/file.ods]

每次有新月份 ODS 檔，執行此腳本並合併至 JSON 即可擴充多月份資料。
"""

import json
import re
import sys
from pathlib import Path
from odf.opendocument import load
from odf.table import Table, TableRow, TableCell
from odf.text import P

# ── 常數對應表 ──────────────────────────────────────────────────────────

SHEET_TO_AIRPORT = {
    '36-1': 'TPE',
    '36-2': 'KHH',
    '36-3': 'TSA',
    '36-4': 'RMQ',
}

# 民航局縮寫 → 全名（只處理四家目標航司）
AIRLINE_NAME_MAP = {
    '中華':     ('中華航空', 'CI'),
    '長榮':     ('長榮航空', 'BR'),
    '星宇':     ('星宇航空', 'JX'),
    '台灣虎航': ('台灣虎航', 'IT'),
}
TARGET_ABBREVS = set(AIRLINE_NAME_MAP.keys())

# 中文航點名稱 → (機場代碼, 國家 / 地區)
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
    '松山':       ('MYJ', '日本'),   # 日本松山（愛媛）
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
    # ── 韓國 ──
    '首爾仁川':   ('ICN', '韓國'),
    '首爾金浦':   ('GMP', '韓國'),
    '釜山':       ('PUS', '韓國'),
    '濟州':       ('CJU', '韓國'),
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
    '清邁':       ('CNX', '泰國'),
    '普吉':       ('HKT', '泰國'),
    '河內':       ('HAN', '越南'),
    '胡志明市':   ('SGN', '越南'),
    '峴港':       ('DAD', '越南'),
    '富國島':     ('PQC', '越南'),
    '新加坡':     ('SIN', '新加坡'),
    '吉隆坡':     ('KUL', '馬來西亞'),
    '檳城':       ('PEN', '馬來西亞'),
    '馬尼拉':     ('MNL', '菲律賓'),
    '宿霧':       ('CEB', '菲律賓'),
    '克拉克':     ('CRK', '菲律賓'),
    '雅加達':     ('CGK', '印尼'),
    '峇里島':     ('DPS', '印尼'),
    '金邊':       ('PNH', '柬埔寨'),
    # ── 南亞 / 中東 ──
    # ── 大洋洲 ──
    '雪梨':       ('SYD', '澳洲'),
    '墨爾本':     ('MEL', '澳洲'),
    '布里斯本':   ('BNE', '澳洲'),
    # ── 太平洋 ──
    '帛琉':       ('ROR', '帛琉'),
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

# ── 工具函式 ──────────────────────────────────────────────────────────

def cell_text(cell) -> str:
    ps = cell.getElementsByType(P)
    return ' '.join(str(p) for p in ps).strip() if ps else ''

def parse_num(s: str) -> float:
    """'1,234.5' → 1234.5, '88.8' → 88.8"""
    try:
        return float(s.replace(',', ''))
    except (ValueError, AttributeError):
        return 0.0

def get_row_values(row, n: int = 16) -> list[str]:
    """展開 numberColumnsRepeated 後取前 n 欄"""
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
    """115年4月_1752_144902.ods → '115年4月'"""
    name = Path(path).stem
    m = re.match(r'(\d+年\d+月)', name)
    return m.group(1) if m else Path(path).stem

# ── 主解析邏輯 ────────────────────────────────────────────────────────

def parse_sheet(sheet, origin_code: str, month: str) -> list[dict]:
    records: list[dict] = []
    current_dest_name = ''
    rows = sheet.getElementsByType(TableRow)

    for row in rows:
        vals = get_row_values(row)

        # 跳過空行
        if not any(vals):
            continue

        # 判斷是否為「航點小計行」
        # 特徵：col0 空、col1 有中文、col2 空
        if not vals[0] and vals[1] and not vals[2]:
            current_dest_name = vals[1].strip()
            continue

        # 判斷是否為「航空公司明細行」
        # 特徵：col0 為數字、col2 在 TARGET_ABBREVS
        if vals[0].isdigit() and vals[2] in TARGET_ABBREVS:
            airline_abbrev = vals[2]
            full_name, code = AIRLINE_NAME_MAP[airline_abbrev]

            dest_info = DEST_MAP.get(current_dest_name)
            if dest_info is None:
                # 未對應的航點，印警告後跳過
                print(f'  [warn] unknown dest: "{current_dest_name}" (origin={origin_code})')
                continue

            dest_code, country = dest_info

            rec = {
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
            }
            records.append(rec)

    return records

def parse_ods(ods_path: str) -> list[dict]:
    month = infer_month(ods_path)
    doc = load(ods_path)
    sheets = doc.spreadsheet.getElementsByType(Table)
    sheet_map = {s.getAttribute('name'): s for s in sheets}

    all_records: list[dict] = []
    for sheet_name, origin_code in SHEET_TO_AIRPORT.items():
        if sheet_name not in sheet_map:
            print(f'[skip] sheet {sheet_name} not found')
            continue
        recs = parse_sheet(sheet_map[sheet_name], origin_code, month)
        print(f'  {sheet_name} ({origin_code}): {len(recs)} records')
        all_records.extend(recs)

    return all_records

# ── 合併寫出（支援多月份追加）────────────────────────────────────────

def merge_and_write(new_records: list[dict], output_path: str) -> None:
    out = Path(output_path)
    existing: list[dict] = []

    if out.exists():
        with open(out, 'r', encoding='utf-8') as f:
            existing = json.load(f)

    # 以（月份、出發地、目的地、航空公司）作為去重鍵值。
    def key(r: dict) -> tuple:
        return (r['month'], r['originAirportCode'], r['destinationAirportCode'], r['airlineName'])

    existing_keys = {key(r) for r in existing}
    added = [r for r in new_records if key(r) not in existing_keys]

    merged = existing + added
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f'\nOutput: {output_path}')
    print(f'  Added {len(added)} new / {len(new_records) - len(added)} duplicate records skipped')
    print(f'  Total records in file: {len(merged)}')

# ── 程式進入點 ────────────────────────────────────────────────────────

if __name__ == '__main__':
    ods_file = sys.argv[1] if len(sys.argv) > 1 else 'src/data/115年4月_1752_144902.ods'
    output_file = 'src/data/monthlyAirlineRoutes.json'

    print(f'Parsing: {ods_file}')
    records = parse_ods(ods_file)
    print(f'Total parsed: {len(records)} records')
    merge_and_write(records, output_file)
