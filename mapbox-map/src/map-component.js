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

import mapboxgl from "mapbox-gl";

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
    new mapboxgl.Marker()
      .setLngLat([model.longitude, model.latitude])
      .addTo(map);
  }, [mapContainerRef]);

  useEffect(() => {
    // check if the map is initialized and itemId is accessible
    if (mapRef.current && model.itemId) {
      // Fit the map to the bounding box
      mapRef.current.flyTo({
        center: [model.longitude, model.latitude],
        zoom: 18,
      });
    }
  }, [model]);
  const [basemapId, setBasemapId] = React.useState("");

  const handleBasemapIdChange = (event) => {
    setBasemapId(event.target.value);
  };
  return (
    <div>
      <div id="map" ref={mapContainerRef}></div>

      <Box sx={{ maxWidth: 120, margin: "10px", bgcolor: "white" }}>
        <FormControl fullWidth sx={{ margin: "5px" }}>
          <InputLabel id="basemap-select-label">Basemap</InputLabel>
          <Select
            labelId="basemap-select-label"
            id="basemap-select"
            value={basemapId}
            label="Basemap"
            onChange={handleBasemapIdChange}
          >
            {/* basemapList.map((basemapItem) => {}) */}
            <MenuItem value={10}>Ten</MenuItem>
            <MenuItem value={20}>Twenty</MenuItem>
            <MenuItem value={30}>Thirty</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </div>
  );
};
export default MapComponent;
