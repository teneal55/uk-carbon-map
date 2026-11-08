"""This script converts GeoJSON data from National Grid (EPSG:27700) eastings and northings
to WGS84 longitude and latitude in degrees ready for drawing regions on mapbox map

See "Generate data from python scripts" in README.md for setting up the virtual
environment and running the scripts.

  1. reads the raw NESO GeoJSON (British National Grid, EPSG:27700)
  2. adds the IDs the app needs (Carbon Intensity API region id, Agile letter)
  3. drops tiny islands and rocks that are invisible at GB zoom
  4. simplifies the outlines (in metres, while still in EPSG:27700)
  5. reprojects to WGS84 longitude/latitude (EPSG:4326), which Mapbox needs
  6. writes a small GeoJSON to public/regions.geojson

To run:
	1. download the 20240503 GeoJSON from
		https://www.neso.energy/data-portal/gis-boundaries-gb-dno-license-areas
	2. save it as data/raw/gb-dno-license-areas-20240503.geojson
	3. run in virtual environment, from the repo root:
		python3 -m venv .venv
		source .venv/bin/activate
		pip install geopandas
		python scripts/prepare_boundaries.py
"""

import geopandas as gpd

from config import (
  AGILE_LETTER_TO_CARBON_REGION,
  MIN_PART_AREA_KM2,
  OUT_PATH,
  RAW_PATH,
  ROOT,
  SIMPLIFY_TOLERANCE_M,
)


def main() -> None:
  #1 read the raw data
  gdf = gpd.read_file(RAW_PATH)
  print(f"Read {len(gdf)} regions, CRS {gdf.crs}")

  if gdf.crs is None or gdf.crs.to_epsg() != 27700:
    raise ValueError(f"Expected EPSG:27700, got {gdf.crs}")

  # 1. IDs the app joins on
  gdf["agile_letter"] = gdf["Name"].str.lstrip("_")
  gdf["region_id"] = gdf["agile_letter"].map(AGILE_LETTER_TO_CARBON_REGION)
  missing = gdf[gdf["region_id"].isna()]
  if not missing.empty:
    raise ValueError(f"No carbon region for: {missing['Name'].tolist()}")
  gdf["region_id"] = gdf["region_id"].astype(int)
  gdf = gdf.rename(columns={"Area": "name", "DNO": "dno", "ID": "dno_id"})
  gdf = gdf[["region_id", "agile_letter", "name", "dno", "dno_id", "geometry"]]

  # 2. Drop tiny parts: split MultiPolygons into single parts, filter, re-merge
  parts = gdf.explode(index_parts=False)
  before = len(parts)
  parts = parts[parts.geometry.area / 1_000_000 >= MIN_PART_AREA_KM2]
  print(f"Kept {len(parts)} of {before} polygon parts")
  gdf = parts.dissolve(by="region_id", aggfunc="first").reset_index()

  # 3. Simplify in metres, before reprojecting
  gdf["geometry"] = gdf.geometry.simplify(
    SIMPLIFY_TOLERANCE_M, preserve_topology=True
  )

  # 4. Reproject to WGS84 longitude/latitude
  gdf = gdf.to_crs(epsg=4326)

  # 5. Write. RFC7946 = standard GeoJSON (lon/lat, no crs member);
  gdf = gdf.sort_values("region_id")
  OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  OUT_PATH.unlink(missing_ok=True)
  gdf.to_file(OUT_PATH, driver="GeoJSON", RFC7946="YES", COORDINATE_PRECISION=5)

  points = sum(
    len(ring.coords)
    for geom in gdf.geometry
    for poly in getattr(geom, "geoms", [geom])
    for ring in [poly.exterior, *poly.interiors]
  )
  size_kb = OUT_PATH.stat().st_size / 1024
  print(f"Wrote {OUT_PATH.relative_to(ROOT)}: {points} points, {size_kb:.0f} KB")
  print("Bounds (lon/lat):", gdf.total_bounds.round(2))


if __name__ == "__main__":
  main()