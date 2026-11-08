"""Build a year of daily average carbon intensity for each GB electricity region.

See "Generate data from python scripts" in README.md for setting up the virtual
environment and running the scripts.

Each run covers the 365 UK days up to and including yesterday:
  1. fetches the half-hourly regional forecasts from the Carbon Intensity API,
    in chunks of 13 days, as this is max period from API
  2. groups the half hour readings into UK days (midnight to midnight)
  3. averages each region's half-hours for each day
  4. writes data/daily-intensity.json for the app

The regional endpoints only provide forecasts, even for past periods, so these
are averages of forecast values. Uses only the Python standard library.

See README for information on how to run.
"""

import json
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import fmean
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data/daily-intensity.json"

API_URL = "https://api.carbonintensity.org.uk/regional/intensity/{start}/{end}"
USER_AGENT = "uk-carbon-map data script"
UK = ZoneInfo("Europe/London")

DAYS = 365
CHUNK = timedelta(days=13)  # max range on the API
HALF_HOUR = timedelta(minutes=30)
REGION_IDS = list(range(1, 15))  # 15-18 are England/Scotland/Wales/GB totals, not map regions
RETRIES = 4
TIMEOUT_S = 120


def uk_midnight_utc(day: date) -> datetime:
  """The start of a UK day, in UTC."""
  return datetime(day.year, day.month, day.day, tzinfo=UK).astimezone(timezone.utc)


def api_time(moment: datetime) -> str:
  """The API's timestamp format, e.g. 2026-11-07T00:00Z."""
  return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def fetch_json(url: str) -> dict:
  """GET a URL as JSON, retrying with a growing wait if it fails."""
  request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
  for attempt in range(1, RETRIES + 1):
    try:
      with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
        return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
      if attempt == RETRIES:
        raise RuntimeError(f"Failed after {RETRIES} attempts: {url}") from error
      wait = 5 * 2 ** (attempt - 1)
      print(f"  attempt {attempt} failed ({error}); retrying in {wait}s")
      time.sleep(wait)
  raise AssertionError("unreachable")


def fetch_half_hours(start: datetime, end: datetime) -> dict[tuple[datetime, int], float]:
  """Every regional forecast for half-hours starting in [start, end), keyed by (start, region id)."""
  readings: dict[tuple[datetime, int], float] = {}
  chunk_start = start
  while chunk_start < end:
    # The API stops at the end of the year a request starts in, so never cross New Year.
    new_year = datetime(chunk_start.year + 1, 1, 1, tzinfo=timezone.utc)
    chunk_end = min(chunk_start + CHUNK, end, new_year)
    url = API_URL.format(start=api_time(chunk_start), end=api_time(chunk_end))
    print(f"Fetching {api_time(chunk_start)} to {api_time(chunk_end)}")
    for period in fetch_json(url)["data"]:
      period_start = datetime.strptime(period["from"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc)
      # Each response also includes the half-hour ending at the chunk start;
      # skip anything outside the range (and the overlap between chunks).
      if not start <= period_start < end:
        continue
      for region in period["regions"]:
        forecast = region["intensity"].get("forecast")
        if region["regionid"] in REGION_IDS and forecast is not None:
          readings[(period_start, region["regionid"])] = forecast
    chunk_start = chunk_end
  return readings


def main() -> None:
  end_day = datetime.now(UK).date() - timedelta(days=1)  # yesterday, the last full UK day
  start_day = end_day - timedelta(days=DAYS - 1)
  days = [start_day + timedelta(days=i) for i in range(DAYS)]
  start, end = uk_midnight_utc(start_day), uk_midnight_utc(end_day + timedelta(days=1))
  print(f"Building daily averages for {start_day} to {end_day} (UK days)")

  readings = fetch_half_hours(start, end)

  # Group each region's half-hours into UK days.
  by_day: dict[tuple[date, int], list[float]] = defaultdict(list)
  for (period_start, region_id), forecast in readings.items():
    by_day[(period_start.astimezone(UK).date(), region_id)].append(forecast)

  periods, values, incomplete = [], [], []
  for day in days:
    day_start, day_end = uk_midnight_utc(day), uk_midnight_utc(day + timedelta(days=1))
    expected = (day_end - day_start) // HALF_HOUR  # 46, 48 or 50
    periods.append({"date": day.isoformat(), "from": api_time(day_start), "to": api_time(day_end)})
    row = []
    for region_id in REGION_IDS:
      half_hours = by_day.get((day, region_id), [])
      row.append(round(fmean(half_hours), 1) if half_hours else None)
      if len(half_hours) < expected:
        incomplete.append(f"{day} region {region_id}: {len(half_hours)}/{expected} half-hours")
    values.append(row)

  output = {
    "generatedAt": api_time(datetime.now(timezone.utc)),
    "timezone": "Europe/London",
    "startDate": start_day.isoformat(),
    "endDate": end_day.isoformat(),
    "regionIds": REGION_IDS,
    "periods": periods,
    "values": values,  # values[day][region]: average gCO2/kWh, or null if no data
  }
  OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  OUT_PATH.write_text(json.dumps(output, separators=(",", ":")) + "\n")

  filled = [v for row in values for v in row if v is not None]
  size_kb = OUT_PATH.stat().st_size / 1024
  print(f"Wrote {OUT_PATH.relative_to(ROOT)}: {len(days)} days x {len(REGION_IDS)} regions, {size_kb:.0f} KB")
  print(f"Daily averages: {len(filled)} filled, {len(values) * len(REGION_IDS) - len(filled)} missing")
  if filled:
    print(f"Range: {min(filled)} to {max(filled)} gCO2/kWh")
  if incomplete:
    print(f"{len(incomplete)} region-days have fewer half-hours than expected, e.g.:")
    for line in incomplete[:10]:
      print(f"  {line}")


if __name__ == "__main__":
  main()
