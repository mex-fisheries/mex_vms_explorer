# Build voronoi_ports.json from mex_ports + mexico_fishing_regions
#
# Builds a Voronoi tessellation of Mexican ports, intersected with the union
# of Mexican fishing regions. Each polygon represents the area closest to a
# given port, constrained to Mexican fishing-region waters.
#
# Reads:
#   - ../mex_ports/data/clean/mex_ports.gpkg
#   - data/mexico_fishing_regions.gpkg
# Writes:
#   - data/voronoi_ports.json
#
# Run from the project root:
#   Rscript scripts/07_build_voronoi_ports.R

library(sf)
library(dplyr)

ports_gpkg   <- "../mex_ports/data/clean/mex_ports.gpkg"
regions_gpkg <- "data/mexico_fishing_regions.gpkg"
out_path     <- "data/voronoi_ports.json"

message("Reading ports from ", ports_gpkg, " ...")
ports <- st_read(ports_gpkg, quiet = TRUE) |>
  st_transform(crs = "EPSG:6372") |>
  select(port_name, port_id)

message(sprintf("  %d ports", nrow(ports)))

message("Reading fishing regions from ", regions_gpkg, " ...")
regions_union <- st_read(regions_gpkg, quiet = TRUE) |>
  st_transform(crs = "EPSG:6372") |>
  st_union()

message("Building Voronoi tessellation ...")
voronoi <- ports |>
  st_union() |>
  st_voronoi(bOnlyEdges = FALSE) |>
  st_collection_extract() |>
  st_as_sf() |>
  rename(geometry = x) |>
  st_intersection(regions_union) |>    # user wants intersection, not crop
  st_join(ports, join = st_nearest_feature) |>
  st_transform(crs = "EPSG:4326") |>
  st_make_valid()

# Simplify modestly to reduce file size (tolerance in degrees, ~1km)
voronoi <- st_simplify(voronoi, dTolerance = 0.01, preserveTopology = TRUE)

st_write(voronoi, out_path, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE,
         layer_options = "COORDINATE_PRECISION=3")
message(sprintf("Wrote %s  (%d features, %s KB)",
                out_path, nrow(voronoi), round(file.size(out_path) / 1024)))
