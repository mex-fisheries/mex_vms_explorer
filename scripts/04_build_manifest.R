# Build manifest.json by scanning all track JSON files
#
# Reads:  data/tracks/YYYY_MM.json  (all files present)
# Writes: data/manifest.json
#
# Run from the mex_gui/ directory:
#   Rscript scripts/04_build_manifest.R

source("scripts/packages.R")

tracks_dir <- "data/tracks"
out_path   <- "data/manifest.json"

track_files <- list.files(tracks_dir, pattern = "^\\d{4}_\\d{2}\\.json$",
                          full.names = TRUE)

if (length(track_files) == 0) {
  stop("No track files found in ", tracks_dir,
       " — run 03_build_tracks.R first.")
}

message(sprintf("Building manifest from %d track files ...", length(track_files)))

months <- map(sort(track_files), function(f) {
  # Read just the scalar fields (year, month, n_vessels) — not the arrays
  d <- read_json(f)
  list(
    year      = d$year,
    month     = d$month,
    n_vessels = d$n_vessels,
    n_records = length(d$vi)
  )
})

manifest <- list(
  months       = months,
  generated_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  year_range   = c(min(map_int(months, "year")), max(map_int(months, "year")))
)

write_json(manifest, out_path, auto_unbox = TRUE, pretty = TRUE)
message(sprintf("Wrote %s  (%d months, years %d–%d)",
                out_path,
                length(months),
                manifest$year_range[1],
                manifest$year_range[2]))
