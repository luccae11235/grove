#!/usr/bin/env python3
"""Build the sourced static series and editorial SVGs for the ACF/PACF article.

This is an editorial asset script, not part of the production build. It expects
openpyxl in the invoking Python environment so it can read UCI's source XLSX.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "tmp" / "acf-pacf-data"
DATA_OUT = ROOT / "apps" / "web" / "src" / "data" / "acf-pacf-examples.json"
ASSET_DIR = ROOT / "apps" / "web" / "public" / "articles" / "acf-pacf"

NASA_URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
    "?parameters=T2M&community=RE&longitude=-73.97&latitude=40.78"
    "&start=20230101&end=20231231&format=JSON&time-standard=LST"
)
M5_PAGE = "https://doi.org/10.5281/zenodo.10203108"
M5_SALES_DATA = (
    "https://zenodo.org/api/records/10203108/files/"
    "sales_train_validation.csv/content"
)
M5_CALENDAR_DATA = (
    "https://zenodo.org/api/records/10203108/files/calendar.csv/content"
)
NHANES_BODY_PAGE = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BMX_J.htm"
NHANES_BODY_DATA = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BMX_J.XPT"
NHANES_DEMOGRAPHICS_DATA = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DEMO_J.XPT"

INK = "#17231e"
MUTED = "#65736c"
ACCENT = "#157451"
ACCENT_LIGHT = "#72ad94"
ACCENT_SOFT = "#e5f3ec"
BORDER = "#e1e9e4"
SURFACE = "#f2f7f4"
FOCUS = "#d99b32"
FOCUS_SOFT = "#fbf1df"


def download(url: str, destination: Path) -> None:
    if destination.exists():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response, destination.open("wb") as output:
        output.write(response.read())


def date_range(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def pearson_at_lag(values: list[float], lag: int) -> float:
    left = values[:-lag]
    right = values[lag:]
    left_mean = statistics.fmean(left)
    right_mean = statistics.fmean(right)
    numerator = sum((x - left_mean) * (y - right_mean) for x, y in zip(left, right))
    denominator = math.sqrt(
        sum((x - left_mean) ** 2 for x in left)
        * sum((y - right_mean) ** 2 for y in right)
    )
    return numerator / denominator


def load_temperature() -> list[dict[str, float | str]]:
    source = CACHE / "nasa-power-nyc-2023.json"
    download(NASA_URL, source)
    payload = json.loads(source.read_text())
    values = payload["properties"]["parameter"]["T2M"]
    return [
        {"date": datetime.strptime(day, "%Y%m%d").date().isoformat(), "value": value}
        for day, value in values.items()
        if value > -900
    ]


def load_sales() -> list[dict[str, float | str]]:
    sales_source = CACHE / "m5-sales-train-validation.csv"
    calendar_source = CACHE / "m5-calendar.csv"
    download(M5_SALES_DATA, sales_source)
    download(M5_CALENDAR_DATA, calendar_source)
    start = date(2015, 1, 1)
    end = date(2015, 3, 31)

    with calendar_source.open(newline="") as source_file:
        calendar = {
            row["d"]: date.fromisoformat(row["date"])
            for row in csv.DictReader(source_file)
        }
    selected_days = {
        day_id: day
        for day_id, day in calendar.items()
        if start <= day <= end
    }
    daily_sales = {day: 0 for day in selected_days.values()}
    with sales_source.open(newline="") as source_file:
        for row in csv.DictReader(source_file):
            if row["store_id"] != "CA_1":
                continue
            for day_id, day in selected_days.items():
                daily_sales[day] += int(row[day_id])

    series = [
        {"date": day.isoformat(), "value": daily_sales[day]}
        for day in date_range(start, end)
    ]
    if any(point["value"] <= 0 for point in series):
        raise ValueError("The selected sales series must be complete and strictly positive.")
    return series


def load_height_weight() -> list[dict[str, float]]:
    body_source = CACHE / "BMX_J.XPT"
    demographics_source = CACHE / "DEMO_J.XPT"
    download(NHANES_BODY_DATA, body_source)
    download(NHANES_DEMOGRAPHICS_DATA, demographics_source)
    body = pd.read_sas(body_source)[["SEQN", "BMXHT", "BMXWT"]]
    demographics = pd.read_sas(demographics_source)[["SEQN", "RIDAGEYR"]]
    measured = body.merge(demographics, on="SEQN").dropna()
    measured = measured[measured["RIDAGEYR"].between(2, 19)]
    return [
        {"height": round(float(row.BMXHT), 1), "weight": round(float(row.BMXWT), 1)}
        for row in measured.itertuples(index=False)
    ]


def text(x: float, y: float, value: str, *, size: int = 14, color: str = INK,
         weight: int = 500, anchor: str = "start") -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="{anchor}" '
        'font-family="Inter, ui-sans-serif, system-ui, sans-serif">'
        f"{value}</text>"
    )


def path_for(values: list[float], left: float, top: float, width: float, height: float,
             minimum: float, maximum: float) -> str:
    points = []
    for index, value in enumerate(values):
        x = left + index / (len(values) - 1) * width
        y = top + (maximum - value) / (maximum - minimum) * height
        points.append(f"{'M' if index == 0 else 'L'} {x:.2f} {y:.2f}")
    return " ".join(points)


def svg_document(title: str, description: str, body: str, width: int = 1000,
                 height: int = 430) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title description">
  <title id="title">{title}</title>
  <desc id="description">{description}</desc>
  <rect width="{width}" height="{height}" fill="#ffffff"/>
  {body}
</svg>
'''


def render_temperature(series: list[dict[str, float | str]]) -> str:
    values = [float(point["value"]) for point in series]
    left, top, width, height = 76, 105, 874, 250
    parts = [
        text(50, 46, "A year in temperature", size=25, weight=600),
        text(50, 73, "New York City · daily mean · 2023", size=14, color=MUTED, weight=400),
    ]
    for tick in (-10, 0, 10, 20, 30):
        y = top + (35 - tick) / 45 * height
        parts.append(f'<line x1="{left}" y1="{y:.2f}" x2="{left + width}" y2="{y:.2f}" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(text(left - 14, y + 5, str(tick), size=12, color=MUTED, weight=400, anchor="end"))
    parts.append(text(left - 14, top - 13, "°C", size=12, color=MUTED, weight=500, anchor="end"))

    month_starts = [index for index, point in enumerate(series) if str(point["date"])[8:] == "01"]
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for index, label in zip(month_starts, month_names):
        x = left + index / (len(values) - 1) * width
        parts.append(text(x, top + height + 31, label, size=12, color=MUTED, weight=400, anchor="middle"))

    line = path_for(values, left, top, width, height, -10, 35)
    area = f"{line} L {left + width:.2f} {top + height:.2f} L {left:.2f} {top + height:.2f} Z"
    parts.append(f'<path d="{area}" fill="{ACCENT_SOFT}" opacity="0.72"/>')
    parts.append(f'<path d="{line}" fill="none" stroke="{ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')
    return svg_document(
        "Daily mean temperature in New York City during 2023",
        "A daily temperature line rises from winter into summer and falls again toward winter, revealing a broad annual seasonal cycle.",
        "\n  ".join(parts),
    )


def render_sales(series: list[dict[str, float | str]]) -> str:
    values = [float(point["value"]) for point in series]
    left, top, width, height = 76, 105, 874, 250
    minimum, maximum = 2000, 7000
    parts = [
        text(50, 46, "Sales return to a weekly rhythm", size=25, weight=600),
        text(50, 73, "Walmart CA_1 · daily units across all products · Jan–Mar 2015", size=14, color=MUTED, weight=400),
    ]
    for tick in (2000, 3000, 4000, 5000, 6000, 7000):
        y = top + (maximum - tick) / (maximum - minimum) * height
        parts.append(f'<line x1="{left}" y1="{y:.2f}" x2="{left + width}" y2="{y:.2f}" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(text(left - 14, y + 5, f"{tick:,}", size=12, color=MUTED, weight=400, anchor="end"))

    for index, point in enumerate(series):
        day = datetime.fromisoformat(str(point["date"])).date()
        if day.weekday() == 0:
            x = left + index / (len(values) - 1) * width
            parts.append(f'<line x1="{x:.2f}" y1="{top}" x2="{x:.2f}" y2="{top + height}" stroke="{SURFACE}" stroke-width="1"/>')

    for label, day in (("Jan", date(2015, 1, 1)), ("Feb", date(2015, 2, 1)), ("Mar", date(2015, 3, 1))):
        index = (day - date(2015, 1, 1)).days
        x = left + index / (len(values) - 1) * width
        parts.append(text(x, top + height + 31, label, size=12, color=MUTED, weight=400, anchor="middle"))

    line = path_for(values, left, top, width, height, minimum, maximum)
    parts.append(f'<path d="{line}" fill="none" stroke="{ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')

    return svg_document(
        "Daily Walmart unit sales for store CA_1 from January through March 2015",
        "The positive sales series rises and falls in a repeating seven-day rhythm without zero-sales days.",
        "\n  ".join(parts),
    )


def render_height_weight(points: list[dict[str, float]]) -> str:
    heights = [point["height"] for point in points]
    weights = [point["weight"] for point in points]
    correlation = statistics.correlation(heights, weights)
    mean_height = statistics.fmean(heights)
    mean_weight = statistics.fmean(weights)
    slope = sum(
        (height - mean_height) * (weight - mean_weight)
        for height, weight in zip(heights, weights)
    ) / sum((height - mean_height) ** 2 for height in heights)
    intercept = mean_weight - slope * mean_height
    left, top, width, height = 86, 112, 864, 270
    x_min, x_max = 75, 205
    y_min, y_max = 0, 210

    def plot_x(value: float) -> float:
        return left + (value - x_min) / (x_max - x_min) * width

    def plot_y(value: float) -> float:
        return top + (y_max - value) / (y_max - y_min) * height

    parts = [
        text(50, 46, "Height and weight move together", size=25, weight=600),
        text(50, 73, f"NHANES 2017–2018 · measured participants ages 2–19 · n = {len(points):,}", size=14, color=MUTED, weight=400),
        text(950, 48, f"Pearson r = {correlation:.2f}", size=16, color=ACCENT, weight=600, anchor="end"),
    ]
    for tick in (0, 50, 100, 150, 200):
        y = plot_y(tick)
        parts.append(f'<line x1="{left}" y1="{y:.2f}" x2="{left + width}" y2="{y:.2f}" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(text(left - 14, y + 5, str(tick), size=12, color=MUTED, weight=400, anchor="end"))
    for tick in (80, 100, 120, 140, 160, 180, 200):
        x = plot_x(tick)
        parts.append(text(x, top + height + 30, str(tick), size=12, color=MUTED, weight=400, anchor="middle"))
    parts.append(text(left + width / 2, top + height + 57, "Height (cm)", size=13, color=MUTED, weight=500, anchor="middle"))
    parts.append(
        f'<text x="24" y="{top + height / 2:.1f}" fill="{MUTED}" font-size="13" font-weight="500" '
        f'text-anchor="middle" transform="rotate(-90 24 {top + height / 2:.1f})" '
        'font-family="Inter, ui-sans-serif, system-ui, sans-serif">Weight (kg)</text>'
    )
    for point in points:
        parts.append(
            f'<circle cx="{plot_x(point["height"]):.2f}" cy="{plot_y(point["weight"]):.2f}" '
            f'r="2.1" fill="{ACCENT_LIGHT}" fill-opacity="0.24"/>'
        )
    line_start_x = max(80, -intercept / slope)
    line_end_x = 200
    parts.append(
        f'<line x1="{plot_x(line_start_x):.2f}" y1="{plot_y(intercept + slope * line_start_x):.2f}" '
        f'x2="{plot_x(line_end_x):.2f}" y2="{plot_y(intercept + slope * line_end_x):.2f}" '
        f'stroke="{ACCENT}" stroke-width="2.2"/>'
    )
    return svg_document(
        "Standing height and weight among measured NHANES participants ages 2 to 19",
        f"A cloud of {len(points):,} measured observations slopes upward from shorter, lighter participants toward taller, heavier participants. Pearson correlation is {correlation:.2f}.",
        "\n  ".join(parts),
        height=470,
    )


def render_lag_one_pairing(series: list[dict[str, float | str]]) -> str:
    first = [float(point["value"]) for point in series[:3]]
    last = [float(point["value"]) for point in series[-2:]]
    pair_rows = [(first[0], first[1]), (first[1], first[2]), None, (last[0], last[1])]
    parts = [
        text(50, 46, "One step becomes one row", size=25, weight=600),
        text(50, 73, "Lag 1 · adjacent days from the sales series", size=14, color=MUTED, weight=400),
        text(70, 116, "Move through the sequence", size=13, color=MUTED, weight=500),
        text(690, 116, "Store each pair", size=13, color=MUTED, weight=500),
        f'<line x1="610" y1="105" x2="610" y2="480" stroke="{BORDER}" stroke-width="1"/>',
    ]

    def highlight(x: float, y: float, width: float, *, next_value: bool = False) -> str:
        fill = FOCUS_SOFT if next_value else ACCENT_SOFT
        stroke = FOCUS if next_value else ACCENT
        dash = ' stroke-dasharray="5 4"' if next_value else ""
        return f'<rect x="{x}" y="{y}" width="{width}" height="48" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="1.5"{dash}/>'

    sequence_rows = [
        (["x₁", "x₂", "x₃", "…", "xₜ"], (0, 1), 158),
        (["x₁", "x₂", "x₃", "…", "xₜ"], (1, 2), 258),
        (["x₁", "x₂", "…", "xₜ₋₁", "xₜ"], (3, 4), 418),
    ]
    x_positions = [70, 175, 280, 385, 500]
    widths = [64, 64, 64, 82, 64]
    for labels, pair, baseline in sequence_rows:
        for position in pair:
            parts.append(highlight(x_positions[position], baseline - 35, widths[position], next_value=position == pair[1]))
        for index, label in enumerate(labels):
            parts.append(text(x_positions[index] + widths[index] / 2, baseline, label, size=23, weight=500, anchor="middle"))
    parts.append(text(320, 348, "⋮", size=28, color=MUTED, weight=400, anchor="middle"))

    table_x, table_y, column_width, row_height = 680, 140, 130, 70
    parts.extend([
        f'<rect x="{table_x}" y="{table_y}" width="{column_width}" height="52" rx="8" fill="{ACCENT_SOFT}"/>',
        f'<rect x="{table_x + column_width}" y="{table_y}" width="{column_width}" height="52" rx="8" fill="{FOCUS_SOFT}"/>',
        text(table_x + column_width / 2, table_y + 33, "Xₜ", size=18, color=ACCENT, weight=600, anchor="middle"),
        text(table_x + column_width * 1.5, table_y + 33, "Xₜ₊₁", size=18, color=FOCUS, weight=600, anchor="middle"),
    ])
    for index, pair in enumerate(pair_rows):
        y = table_y + 52 + index * row_height
        parts.append(f'<rect x="{table_x}" y="{y}" width="{column_width * 2}" height="{row_height}" fill="#ffffff" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(f'<line x1="{table_x + column_width}" y1="{y}" x2="{table_x + column_width}" y2="{y + row_height}" stroke="{BORDER}" stroke-width="1"/>')
        if pair is None:
            parts.append(text(table_x + column_width, y + 42, "⋮", size=22, color=MUTED, weight=400, anchor="middle"))
        else:
            left_value, right_value = pair
            parts.append(text(table_x + column_width / 2, y + 42, f"{left_value:,.0f}", size=17, weight=500, anchor="middle"))
            parts.append(text(table_x + column_width * 1.5, y + 42, f"{right_value:,.0f}", size=17, weight=500, anchor="middle"))

    arrow_rows = [
        (158, table_y + 52 + row_height / 2),
        (258, table_y + 52 + row_height * 1.5),
        (418, table_y + 52 + row_height * 3.5),
    ]
    for source_y, target_y in arrow_rows:
        parts.append(f'<path d="M 566 {source_y - 7} C 620 {source_y - 7}, 625 {target_y}, 665 {target_y}" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
        parts.append(f'<path d="M 665 {target_y} l -8 -5 v 10 z" fill="{MUTED}"/>')

    return svg_document(
        "How adjacent observations become a lag-one paired dataset",
        "Three scans of the same sequence highlight x one with x two, x two with x three, and x T minus one with x T. Each highlighted pair becomes one row in a two-column sales table.",
        "\n  ".join(parts),
        height=510,
    )


def render_lag_two_pairing(series: list[dict[str, float | str]]) -> str:
    first = [float(point["value"]) for point in series[:4]]
    last = [float(point["value"]) for point in series[-3:]]
    pair_rows = [(first[0], first[2]), (first[1], first[3]), None, (last[0], last[2])]
    parts = [
        text(50, 46, "Two steps become one row", size=25, weight=600),
        text(50, 73, "Lag 2 · one day remains between each sales pair", size=14, color=MUTED, weight=400),
        text(70, 116, "Move through the sequence", size=13, color=MUTED, weight=500),
        text(690, 116, "Store each pair", size=13, color=MUTED, weight=500),
        f'<line x1="610" y1="105" x2="610" y2="480" stroke="{BORDER}" stroke-width="1"/>',
    ]

    def highlight(x: float, y: float, width: float, *, later_value: bool = False) -> str:
        fill = FOCUS_SOFT if later_value else ACCENT_SOFT
        stroke = FOCUS if later_value else ACCENT
        dash = ' stroke-dasharray="5 4"' if later_value else ""
        return f'<rect x="{x}" y="{y}" width="{width}" height="48" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="1.5"{dash}/>'

    sequence_rows = [
        (["x₁", "x₂", "x₃", "…", "xₜ"], (0, 2), 158),
        (["x₁", "x₂", "x₃", "x₄", "…"], (1, 3), 258),
        (["x₁", "…", "xₜ₋₂", "xₜ₋₁", "xₜ"], (2, 4), 418),
    ]
    x_positions = [70, 175, 280, 385, 500]
    widths = [64, 64, 64, 64, 64]
    for labels, pair, baseline in sequence_rows:
        for position in pair:
            parts.append(highlight(x_positions[position], baseline - 35, widths[position], later_value=position == pair[1]))
        for index, label in enumerate(labels):
            parts.append(text(x_positions[index] + widths[index] / 2, baseline, label, size=23, weight=500, anchor="middle"))
    parts.append(text(320, 348, "⋮", size=28, color=MUTED, weight=400, anchor="middle"))

    table_x, table_y, column_width, row_height = 680, 140, 130, 70
    parts.extend([
        f'<rect x="{table_x}" y="{table_y}" width="{column_width}" height="52" rx="8" fill="{ACCENT_SOFT}"/>',
        f'<rect x="{table_x + column_width}" y="{table_y}" width="{column_width}" height="52" rx="8" fill="{FOCUS_SOFT}"/>',
        text(table_x + column_width / 2, table_y + 33, "Xₜ", size=18, color=ACCENT, weight=600, anchor="middle"),
        text(table_x + column_width * 1.5, table_y + 33, "Xₜ₊₂", size=18, color=FOCUS, weight=600, anchor="middle"),
    ])
    for index, pair in enumerate(pair_rows):
        y = table_y + 52 + index * row_height
        parts.append(f'<rect x="{table_x}" y="{y}" width="{column_width * 2}" height="{row_height}" fill="#ffffff" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(f'<line x1="{table_x + column_width}" y1="{y}" x2="{table_x + column_width}" y2="{y + row_height}" stroke="{BORDER}" stroke-width="1"/>')
        if pair is None:
            parts.append(text(table_x + column_width, y + 42, "⋮", size=22, color=MUTED, weight=400, anchor="middle"))
        else:
            left_value, right_value = pair
            parts.append(text(table_x + column_width / 2, y + 42, f"{left_value:,.0f}", size=17, weight=500, anchor="middle"))
            parts.append(text(table_x + column_width * 1.5, y + 42, f"{right_value:,.0f}", size=17, weight=500, anchor="middle"))

    arrow_rows = [
        (158, table_y + 52 + row_height / 2),
        (258, table_y + 52 + row_height * 1.5),
        (418, table_y + 52 + row_height * 3.5),
    ]
    for source_y, target_y in arrow_rows:
        parts.append(f'<path d="M 566 {source_y - 7} C 620 {source_y - 7}, 625 {target_y}, 665 {target_y}" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
        parts.append(f'<path d="M 665 {target_y} l -8 -5 v 10 z" fill="{MUTED}"/>')

    return svg_document(
        "How observations two steps apart become a lag-two paired dataset",
        "Three scans highlight x one with x three, x two with x four, and x T minus two with x T. One unselected value remains between each pair, and every pair becomes one row in a two-column sales table.",
        "\n  ".join(parts),
        height=510,
    )


def render_lag_scatter(series: list[dict[str, float | str]], lag: int) -> str:
    values = [float(point["value"]) for point in series]
    left_values = values[:-lag]
    right_values = values[lag:]
    correlation = statistics.correlation(left_values, right_values)
    mean_left = statistics.fmean(left_values)
    mean_right = statistics.fmean(right_values)
    slope = sum(
        (x - mean_left) * (y - mean_right)
        for x, y in zip(left_values, right_values)
    ) / sum((x - mean_left) ** 2 for x in left_values)
    intercept = mean_right - slope * mean_left
    left, top, width, height = 96, 112, 844, 275
    minimum, maximum = 2000, 7000
    pair_description = "adjacent daily-sales pairs" if lag == 1 else f"daily-sales pairs, {lag} days apart"

    def plot_x(value: float) -> float:
        return left + (value - minimum) / (maximum - minimum) * width

    def plot_y(value: float) -> float:
        return top + (maximum - value) / (maximum - minimum) * height

    parts = [
        text(50, 46, f"Lag {lag} as a scatter plot", size=25, weight=600),
        text(50, 73, f"{len(left_values)} {pair_description} · Jan–Mar 2015", size=14, color=MUTED, weight=400),
        text(950, 48, f"Pearson r = {correlation:.2f}", size=16, color=ACCENT, weight=600, anchor="end"),
    ]
    for tick in (2000, 3000, 4000, 5000, 6000, 7000):
        x = plot_x(tick)
        y = plot_y(tick)
        label = f"{tick:,}"
        parts.append(f'<line x1="{left}" y1="{y:.2f}" x2="{left + width}" y2="{y:.2f}" stroke="{BORDER}" stroke-width="1"/>')
        parts.append(text(left - 14, y + 5, label, size=12, color=MUTED, weight=400, anchor="end"))
        parts.append(text(x, top + height + 31, label, size=12, color=MUTED, weight=400, anchor="middle"))
    parts.append(text(left + width / 2, top + height + 58, "Sales at t", size=13, color=MUTED, weight=500, anchor="middle"))
    parts.append(
        f'<text x="25" y="{top + height / 2:.1f}" fill="{MUTED}" font-size="13" font-weight="500" '
        f'text-anchor="middle" transform="rotate(-90 25 {top + height / 2:.1f})" '
        f'font-family="Inter, ui-sans-serif, system-ui, sans-serif">Sales at t + {lag}</text>'
    )
    for x_value, y_value in zip(left_values, right_values):
        parts.append(
            f'<circle cx="{plot_x(x_value):.2f}" cy="{plot_y(y_value):.2f}" r="4" '
            f'fill="{ACCENT_LIGHT}" fill-opacity="0.62" stroke="#ffffff" stroke-width="0.8"/>'
        )
    parts.append(
        f'<line x1="{plot_x(minimum):.2f}" y1="{plot_y(intercept + slope * minimum):.2f}" '
        f'x2="{plot_x(maximum):.2f}" y2="{plot_y(intercept + slope * maximum):.2f}" '
        f'stroke="{ACCENT}" stroke-width="2.2"/>'
    )
    return svg_document(
        f"Lag-{lag} scatter plot of daily sales",
        f"{len(left_values)} points compare each day of sales with the day {lag} steps later. The fitted line shows the linear direction, and Pearson correlation is {correlation:.2f}.",
        "\n  ".join(parts),
        height=475,
    )


def render_lag_one_scatter(series: list[dict[str, float | str]]) -> str:
    return render_lag_scatter(series, 1)


def main() -> None:
    temperature = load_temperature()
    sales = load_sales()
    height_weight = load_height_weight()
    sales_values = [float(point["value"]) for point in sales]
    heights = [point["height"] for point in height_weight]
    weights = [point["weight"] for point in height_weight]
    payload = {
        "heightWeight": {
            "label": "Standing height and weight for measured NHANES participants ages 2–19",
            "source": "CDC/NCHS NHANES 2017–2018",
            "sourceUrl": NHANES_BODY_PAGE,
            "variables": {"height": "BMXHT, centimeters", "weight": "BMXWT, kilograms"},
            "selection": "All participants aged 2–19 with non-missing standing height and weight; unweighted sample.",
            "pearsonCorrelation": round(statistics.correlation(heights, weights), 6),
            "values": height_weight,
        },
        "temperature": {
            "label": "Daily mean temperature in New York City",
            "unit": "°C",
            "source": "NASA POWER",
            "sourceUrl": NASA_URL,
            "parameter": "T2M daily mean at 40.78°N, 73.97°W in local solar time",
            "licenseNote": "NASA POWER analysis-ready meteorological data",
            "values": temperature,
        },
        "sales": {
            "label": "Daily unit sales for Walmart store CA_1",
            "unit": "items sold",
            "source": "M5 Forecasting dataset",
            "sourceUrl": M5_PAGE,
            "provider": "Walmart",
            "publisher": "University of Nicosia via Zenodo",
            "selection": "Store CA_1, January through March 2015; all product series.",
            "transformation": "Sum daily units sold across all products in store CA_1. The selected series is complete and strictly positive.",
            "pearsonCorrelationByLag": {
                str(lag): round(pearson_at_lag(sales_values, lag), 6)
                for lag in range(1, 11)
            },
            "values": sales,
        },
    }
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(payload, indent=2) + "\n")
    (ASSET_DIR / "nhanes-height-weight-youth.svg").write_text(render_height_weight(height_weight))
    (ASSET_DIR / "lag-one-pairing.svg").write_text(render_lag_one_pairing(sales))
    (ASSET_DIR / "lag-one-sales-scatter.svg").write_text(render_lag_one_scatter(sales))
    (ASSET_DIR / "lag-two-pairing.svg").write_text(render_lag_two_pairing(sales))
    (ASSET_DIR / "lag-two-sales-scatter.svg").write_text(render_lag_scatter(sales, 2))
    (ASSET_DIR / "nyc-daily-temperature-2023.svg").write_text(render_temperature(temperature))
    (ASSET_DIR / "m5-ca1-daily-sales-2015-q1.svg").write_text(render_sales(sales))


if __name__ == "__main__":
    main()
