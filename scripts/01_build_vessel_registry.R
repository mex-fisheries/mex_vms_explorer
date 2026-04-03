# Build vessel_registry.json from the vessel registry CSV + VMS files
#
# Reads:
#   - mex_vessel_registry/data/clean/complete_vessel_registry.csv
#   - All VMS CSVs in mex_vms/data/clean/ (to find VMS-active vessels)
# Writes:
#   - data/vessel_registry.json
#
# Run from the mex_gui/ directory:
#   Rscript scripts/01_build_vessel_registry.R

source("scripts/packages.R")

# --- Paths -------------------------------------------------------------------
registry_csv <- "../mex_vessel_registry/data/clean/complete_vessel_registry.csv"
vms_dir      <- "../mex_vms/data/clean"
out_path     <- "data/vessel_registry.json"

# --- Find all VMS-active vessel RNPAs ----------------------------------------
message("Scanning VMS files for active vessel RNPAs ...")
vms_files <- list.files(vms_dir, pattern = "^MEX_VMS_.*\\.csv$", full.names = TRUE)

active_rnpas <- map(vms_files, function(f) {
  read_csv(f, col_select = vessel_rnpa, show_col_types = FALSE) |>
    pull(vessel_rnpa) |>
    unique()
}, .progress = TRUE) |>
  unlist() |>
  unique() |>
  sort()

message(sprintf("Found %d unique active vessel RNPAs across %d VMS files.",
                length(active_rnpas), length(vms_files)))

# --- Read and filter vessel registry -----------------------------------------
message("Reading vessel registry ...")
registry <- read_csv(registry_csv, show_col_types = FALSE)

# Keep only vessels that appear in VMS data
registry_active <- registry |>
  filter(vessel_rnpa %in% active_rnpas) |>
  arrange(vessel_rnpa)  # deterministic order → stable vessel indices

message(sprintf("Vessels in registry with VMS activity: %d / %d",
                nrow(registry_active), length(active_rnpas)))

# --- Build the index array (0-based, matches track JSON files) ---------------
idx_to_rnpa <- registry_active$vessel_rnpa

# --- Build vessel metadata lookup --------------------------------------------
vessels <- registry_active |>
  transmute(
    rnpa    = vessel_rnpa,
    name    = vessel_name,
    fleet   = fleet,
    state   = state,
    port    = home_port,
    # Species flags: [finfish, sardine, shark, shrimp, tuna, other]
    target  = pmap(list(target_finfish, target_sardine, target_shark,
                        target_shrimp, target_tuna, target_other),
                   ~ as.integer(c(..1, ..2, ..3, ..4, ..5, ..6))),
    # Gear flags: [trawler, purse_seine, longline, other]
    gear    = pmap(list(gear_trawler, gear_purse_seine, gear_longline, gear_other),
                   ~ as.integer(c(..1, ..2, ..3, ..4)))
  ) |>
  # Convert to a named list keyed by RNPA
  (\(df) setNames(
    pmap(df, function(rnpa, name, fleet, state, port, target, gear) {
      list(name = name, fleet = fleet, state = state, port = port,
           target = target, gear = gear)
    }),
    df$rnpa
  ))()

# --- Write JSON --------------------------------------------------------------
out <- list(
  idx_to_rnpa = idx_to_rnpa,
  vessels     = vessels
)

dir.create(dirname(out_path), showWarnings = FALSE, recursive = TRUE)
write_json(out, out_path, auto_unbox = TRUE, pretty = FALSE)
message(sprintf("Wrote %s  (%s KB)", out_path,
                round(file.size(out_path) / 1024)))
