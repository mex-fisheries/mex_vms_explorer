# Build ports.json from the mex_ports CSV
#
# Reads:  mex_ports/data/clean/mex_ports.csv
# Writes: data/ports.json
#
# Run from the mex_gui/ directory:
#   Rscript scripts/02_build_ports.R

source("scripts/packages.R")

ports_csv <- "../mex_ports/data/clean/mex_ports.csv"
out_path  <- "data/ports.json"

ports <- read_csv(ports_csv, show_col_types = FALSE) |>
  transmute(
    id   = port_id,
    name = port_name,
    lon  = round(longitude, 4),
    lat  = round(latitude, 4)
  ) |>
  filter(!is.na(lon), !is.na(lat))

dir.create(dirname(out_path), showWarnings = FALSE, recursive = TRUE)
write_json(ports, out_path, auto_unbox = TRUE, pretty = FALSE)
message(sprintf("Wrote %s  (%d ports)", out_path, nrow(ports)))
