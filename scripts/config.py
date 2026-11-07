from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data/raw/gb-dno-license-areas-20240503.geojson"
OUT_PATH = ROOT / "public/regions.geojson"

SIMPLIFY_TOLERANCE_M = 500  # max distance a simplified line may move, in metres
MIN_PART_AREA_KM2 = 2  # drop island/rock parts smaller than this

# The raw file's "Name" column holds the GSP group letter (e.g. "_A"), which is
# also the Agile tariff region letter. Map it to the Carbon Intensity API's
# regionid (1-14). The raw "ID" column (10-23) is a different numbering.
AGILE_LETTER_TO_CARBON_REGION = {
    "P": 1,   # North Scotland
    "N": 2,   # South Scotland
    "G": 3,   # North West England
    "F": 4,   # North East England
    "M": 5,   # Yorkshire
    "D": 6,   # North Wales & Merseyside
    "K": 7,   # South Wales
    "E": 8,   # West Midlands
    "B": 9,   # East Midlands
    "A": 10,  # East England
    "L": 11,  # South West England
    "H": 12,  # South England
    "C": 13,  # London
    "J": 14,  # South East England
}
