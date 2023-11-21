import React, { useRef, useEffect, useState } from "react";

import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";

import mapboxgl from "!mapbox-gl";

/**
 * Extended Mapbox GL JS Layer with component-specific properties,
 * @typedef {object} MapComponentLayer
 * @extends import("mapbox-gl").Layer
 * @property {boolean} itemDependant whether to rerender layer on `itemId` change
 */

/**
 * Extended Mapbox GL JS Marker with component-specific properties.
 * @typedef {object} MapComponentMarker
 * @extends import("mapbox-gl").Layer
 * @property {boolean} itemDependant whether to rerender marker on `itemId` change
 */

/**
 * @typedef {object} MapComponentModel
 * @property {string} mapboxAccessToken Access token for Mapbox GL JS
 * @property {string} itemId ID of the current selected item in Retool. Change causes item-specific layers and markers to rerender.
 * @property {MapComponentLayer[]} layers Array of layers to display.
 * @property {import("mapbox-gl").MarkerOptions[]} markers Array of markers to display.
 */

const MapComponent = ({ triggerQuery, model, modelUpdate }) => {
  const mapBasemapRef = useRef(null);
  const basemapListRef = useRef([
    {
      id: "mapbox-streets-v12",
      name: "Mapbox Streets",
      type: "style",
      url: "mapbox://styles/mapbox/streets-v12",
    },
    {
      id: "mapbox-satellite-v9",
      name: "Mapbox Satellite",
      type: "style",
      url: "mapbox://styles/mapbox/satellite-v9",
    },
  ]);
  const [basemapId, setBasemapId] = React.useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    mapboxgl.accessToken = model.mapboxAccessToken;
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 2,
    });
    // add navigation control
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // save map instance to ref
    mapRef.current = map;

    // add a marker at the center
    for (const marker of model.markers) {
      new mapboxgl.Marker()
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);
    }
  }, [mapContainerRef]);

  useEffect(() => {
    // check if the map is initialized and itemId is accessible
    if (mapRef.current && model.itemId) {
      // Fit the map to the bounding box
      // mapRef.current.flyTo({
      //   center: [model.longitude, model.latitude],
      //   zoom: 18,
      // });
      // for (const marker of model.markers) {
      //   new mapboxgl.Marker()
      //     .setLngLat([marker.longitude, marker.latitude])
      //     .addTo(map);
      // }
    }
  }, [model.itemId]);

  const handleBasemapIdChange = (event) => {
    setBasemapId(event.target.value);
    mapRef.current.setStyle(basemapId.url);
  };
  return (
    <div>
      <div id="map" ref={mapContainerRef} style={{ zIndex: -1 }}></div>

      <Box
        sx={{
          maxWidth: 350,
          margin: "10px",
          bgcolor: "white",
          borderRadius: "5px",
        }}
      >
        <FormControl sx={{ margin: "10px", width: "40%" }}>
          <InputLabel id="basemap-select-label">Basemap</InputLabel>
          <Select
            labelId="basemap-select-label"
            id="basemap-select"
            value={basemapId}
            label="Basemap"
            onChange={handleBasemapIdChange}
          >
            {basemapListRef.current.map((basemapItem) => (
              <MenuItem key={basemapItem.id} value={basemapItem.id}>
                {basemapItem.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </div>
  );
};
export default MapComponent;
