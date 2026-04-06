# Build monthly track JSON files from VMS CSVs
#
# For each monthly VMS CSV, computes daily vessel centroids (mean lat/lon/speed)
# and writes a compact JSON file consumed by the web app.
#
# Output format (data/tracks/YYYY_MM.json):
# {
#   "year": 2023, "month": 1, "n_vessels": 1150,
#   "vi":  [vessel_index, ...],   <- 0-based index into registry$idx_to_rnpa
#   "day": [day_of_month, ...],
#   "lat": [mean_latitude, ...],
#   "lon": [mean_longitude, ...],
#   "spd": [mean_speed_knots, ...]
# }
# Records are sorted by (vessel_index, day).
#
# Reads:
#   - data/vessel_registry.json  (built by 01_build_vessel_registry.R)
#   - mex_vms/data/clean/MEX_VMS_YYYY_MM.csv  for each requested year
# Writes:
#   - data/tracks/YYYY_MM.json  (skips if already exists)
#
# Run from the mex_gui/ directory:
#   Rscript scripts/03_build_tracks.R
#   Rscript scripts/03_build_tracks.R 2022 2023   # specific years

source("scripts/packages.R")

# --- Configuration -----------------------------------------------------------
vms_dir      <- "../mex_vms/data/clean"
registry_path <- "data/vessel_registry.json"
out_dir      <- "data/tracks"

# Years to process (default: 2023 demo; pass args to override)
args <- commandArgs(trailingOnly = TRUE)
target_years <- if (length(args) > 0) as.integer(args) else 2023L

# Valid coordinate bounding box for Mexican EEZ (approximate)
LAT_MIN <- 10; LAT_MAX <- 35
LON_MIN <- -122; LON_MAX <- -82

# --- Load vessel registry index ----------------------------------------------
message("Loading vessel registry ...")
registry <- read_json(registry_path)
# Build a named integer vector: RNPA → 0-based vessel index
rnpa_to_idx <- setNames(
  seq_along(registry$idx_to_rnpa) - 1L,
  registry$idx_to_rnpa
)
message(sprintf("Registry contains %d vessels.", length(rnpa_to_idx)))

# --- Process each monthly file -----------------------------------------------
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

vms_files <- list.files(vms_dir, pattern = "^MEX_VMS_\\d{4}_\\d{2}\\.csv$",
                        full.names = TRUE)

# Filter to target years
vms_files <- vms_files[
  as.integer(str_extract(basename(vms_files), "\\d{4}")) %in% target_years
]

if (length(vms_files) == 0) {
  stop("No VMS files found for years: ", paste(target_years, collapse = ", "))
}

message(sprintf("Processing %d VMS files ...", length(vms_files)))

walk(vms_files, function(f) {
  fname  <- basename(f)
  parts  <- str_match(fname, "MEX_VMS_(\\d{4})_(\\d{2})\\.csv")
  year   <- as.integer(parts[, 2])
  month  <- as.integer(parts[, 3])
  out_f  <- file.path(out_dir, sprintf("%d_%02d.json", year, month))

  if (file.exists(out_f)) {
    message(sprintf("  Skipping %s (already built)", fname))
    return(invisible(NULL))
  }

  message(sprintf("  Processing %s ...", fname))

  # Read CSV (Latin-1 encoding for Spanish vessel names)
  vms <- read_csv(f, show_col_types = FALSE, locale = locale(encoding = "latin1"),
                  col_types = cols(
                    vessel_rnpa = col_character(),
                    lat         = col_double(),
                    lon         = col_double(),
                    speed       = col_double(),
                    datetime    = col_character()
                  ))

  # Extract day of month from datetime
  vms <- vms |>
    mutate(
      day = as.integer(format(as.POSIXct(datetime, tz = "UTC"), "%d"))
    ) |>
    # Remove out-of-bounds coordinates (data quality filter)
    filter(
      between(lat, LAT_MIN, LAT_MAX),
      between(lon, LON_MIN, LON_MAX),
      !is.na(speed)
    ) |>
    # Keep only vessels present in the registry
    filter(vessel_rnpa %in% names(rnpa_to_idx))

  if (nrow(vms) == 0) {
    message(sprintf("    No valid records in %s — skipping.", fname))
    return(invisible(NULL))
  }

  # Daily centroid: mean lat, lon, speed, and ping count per vessel-day
  daily <- vms |>
    group_by(vessel_rnpa, day) |>
    summarise(
      lat = round(mean(lat, na.rm = TRUE), 4),
      lon = round(mean(lon, na.rm = TRUE), 4),
      spd = round(mean(speed, na.rm = TRUE), 1),
      n   = n(),
      .groups = "drop"
    ) |>
    # Map RNPA to integer vessel index
    mutate(vi = rnpa_to_idx[vessel_rnpa]) |>
    # Sort by (vessel index, day) for efficient JS lookup
    arrange(vi, day)

  # Build output object with columnar arrays
  out <- list(
    year     = year,
    month    = month,
    n_vessels = n_distinct(daily$vessel_rnpa),
    vi       = as.integer(daily$vi),
    day      = as.integer(daily$day),
    lat      = daily$lat,
    lon      = daily$lon,
    spd      = daily$spd,
    n        = as.integer(daily$n)
  )

  write_json(out, out_f, auto_unbox = TRUE, pretty = FALSE)
  message(sprintf("    Wrote %s  (%d vessels, %d records, %s KB)",
                  basename(out_f), out$n_vessels, nrow(daily),
                  round(file.size(out_f) / 1024)))
})

message("Done.")
