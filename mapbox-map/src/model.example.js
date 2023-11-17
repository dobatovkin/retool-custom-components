export const retoolModel = {
  row_id:  table1.selectedRow.id ,
  latitude:  defNewLatitude.value  ,
  longitude:  defNewLongitude.value  ,
  rp_lat: defRpLatitude.value ,
  rp_lon: defRpLongitude.value ,
  source_lat: editLocationLatitude.value,
  source_lon: editLocationLongitude.value,
  google_lat:  table1.selectedRow.google_latitude,
  google_lon:  table1.selectedRow.google_longitude,
  bing_lat:  table1.selectedRow.bing_latitude,
  bing_lon:  table1.selectedRow.bing_longitude,
  here_lat:  table1.selectedRow.here_latitude,
  here_lon:  table1.selectedRow.here_longitude,
  featureCollection: JSON.parse(table1.selectedRow.geojson),
  mapCenter: null,
  debug: null
}