# Build mpas.json (GeoJSON) from Mexico MPAs geopackage
#
# Reads:  data/mexico_mpas.gpkg
# Writes: data/mpas.json
#
# Run from the project root:
#   Rscript scripts/05_build_mpas.R

library(sf)
library(jsonlite)

gpkg_path <- "data/mexico_mpas.gpkg"
out_path  <- "data/mpas.json"

message("Reading MPAs from ", gpkg_path, " ...")
mpas <- st_read(gpkg_path, quiet = TRUE)

# Simplify geometry to reduce file size (tolerance in degrees, ~100m)
mpas <- st_simplify(mpas, dTolerance = 0.005, preserveTopology = TRUE)

# Keep only useful columns
mpas <- mpas[, c("SITE_NAME", "lfps")]
names(mpas)[names(mpas) == "SITE_NAME"] <- "name"

# Write as GeoJSON with reduced coordinate precision (~100m)
st_write(mpas, out_path, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE,
         layer_options = "COORDINATE_PRECISION=3")
message(sprintf("Wrote %s  (%d features, %s KB)",
                out_path, nrow(mpas), round(file.size(out_path) / 1024)))
