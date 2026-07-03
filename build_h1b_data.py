"""
build_h1b_data.py
Merges all LCA Disclosure Excel files in this folder into one h1b_data.json
for the VisaTrack extension.

Usage:
    python3 build_h1b_data.py

Reads every LCA_Disclosure_Data_FY*.xlsx file in the current folder,
keeps only certified H-1B rows, counts filings per employer, and writes
h1b_data.json.
"""

import pandas as pd
import json
import glob
import re
import os

# ── Find all the Excel files automatically ──
patterns = ['LCA_Disclosure_Data_FY*.xlsx', 'H-1B*.xlsx', 'H1B*.xlsx']
files = []
for p in patterns:
    files.extend(glob.glob(p))
files = sorted(set(files))

if not files:
    print("❌ No LCA Excel files found in this folder.")
    print("   Make sure you run this from inside the VisaTrack folder.")
    raise SystemExit(1)

print(f"Found {len(files)} file(s):")
for f in files:
    print(f"   • {f}")
print()


def normalize(name):
    """Match the same normalization the extension uses."""
    if not isinstance(name, str):
        return ''
    name = name.lower().strip()
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(
        r'\b(inc|llc|corp|ltd|co|corporation|incorporated)\b\.?',
        '', name
    ).strip()
    return name


# Company -> total certified H-1B filing count
counts = {}

for f in files:
    print(f"Reading {f} ...", end=' ', flush=True)
    try:
        # Only read the columns we need — keeps memory low
        df = pd.read_excel(
            f,
            usecols=lambda c: c.upper() in (
                'EMPLOYER_NAME', 'CASE_STATUS', 'VISA_CLASS'
            ),
            engine='openpyxl'
        )
    except Exception as e:
        print(f"\n   ⚠️  Skipped ({e})")
        continue

    # Normalize column names to uppercase
    df.columns = [c.upper() for c in df.columns]

    if 'EMPLOYER_NAME' not in df.columns:
        print("\n   ⚠️  No EMPLOYER_NAME column, skipping")
        continue

    # Keep only certified H-1B rows
    status = df.get('CASE_STATUS', pd.Series([''] * len(df))).astype(str).str.upper()
    visa = df.get('VISA_CLASS', pd.Series([''] * len(df))).astype(str).str.upper()

    mask = status.str.contains('CERTIFIED', na=False) & visa.str.startswith('H-1B', na=False)
    kept = df[mask]

    for name in kept['EMPLOYER_NAME']:
        key = normalize(name)
        if not key:
            continue
        counts[key] = counts.get(key, 0) + 1

    print(f"{len(kept):,} certified H-1B rows")

print()
print(f"Total unique companies: {len(counts):,}")

# Write JSON — compact format
with open('h1b_data.json', 'w', encoding='utf-8') as f:
    json.dump(counts, f, ensure_ascii=False, separators=(',', ':'))

size_mb = os.path.getsize('h1b_data.json') / 1_000_000
print(f"✅ Wrote h1b_data.json ({size_mb:.1f} MB)")

# Show top 5 sponsors as a sanity check
top5 = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
print("\nTop 5 sponsors:")
for name, n in top5:
    print(f"   {name}: {n:,}")
    