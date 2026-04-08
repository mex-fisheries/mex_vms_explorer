# Build fishing_regions.json (GeoJSON) from Mexico fishing regions geopackage
#
# Reads:  data/mexico_fishing_regions.gpkg
# Writes: data/fishing_regions.json
#
# Run from the project root:
#   Rscript scripts/06_build_fishing_regions.R

library(sf)
library(jsonlite)

gpkg_path <- "data/mexico_fishing_regions.gpkg"
out_path  <- "data/fishing_regions.json"

message("Reading fishing regions from ", gpkg_path, " ...")
regions <- st_read(gpkg_path, quiet = TRUE)

# Simplify geometry to reduce file size (tolerance in degrees, ~100m)
regions <- st_simplify(regions, dTolerance = 0.01, preserveTopology = TRUE)

# Write as GeoJSON with reduced coordinate precision (~1km)
st_write(regions, out_path, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE,
         layer_options = "COORDINATE_PRECISION=3")
message(sprintf("Wrote %s  (%d features, %s KB)",
                out_path, nrow(regions), round(file.size(out_path) / 1024)))
