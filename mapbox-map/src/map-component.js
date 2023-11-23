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
 * @property {object[]} basemaps
 * @property {MapComponentLayer[]} layers Array of layers to display.
 * @property {import("mapbox-gl").MarkerOptions[]} markers Array of markers to display.
 */

const MapComponent = ({ triggerQuery, model, modelUpdate }) => {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);
  const basemapList = useRef(null);
  const overlayList = useRef(null);
  const [basemapId, setBasemapId] = useState("");
  const [overlayId, setOverlayId] = useState("");
  const markersList = useRef([]);
  const markersOptionsList = useRef([]);

  const reloadBasemapList = () => {
    basemapList.current = [
      {
        id: "mapbox-streets-v12",
        name: "Mapbox Streets",
        type: "style",
        url: "mapbox://styles/mapbox/streets-v12",
        default: true,
      },
      {
        id: "mapbox-satellite-v9",
        name: "Mapbox Satellite",
        type: "style",
        url: "mapbox://styles/mapbox/satellite-v9",
      },
    ];
    // add basemaps from model
    for (const basemapItem of model.basemaps) {
      basemapList.current.push(basemapItem);
    }
  };

  const reloadOverlayList = () => {
    overlayList.current = [];
    for (const overlayItem of model.overlays) {
      overlayList.current.push(overlayItem);
    }
  };

  const reloadMarkers = () => {
    // check if the map is initialized and itemId is accessible
    if (mapRef.current && model.markers) {
      // cleanup previous markers
      for (let i = markersList.current.length - 1; i >= 0; i--) {
        markersList.current[i].remove();
      }
      markersList.current = [];
      markersOptionsList.current = [];

      // add new markers to the map
      for (const markerOptions of model.markers) {
        const marker = new mapboxgl.Marker(markerOptions)
          .setLngLat([markerOptions.lnglat.lng, markerOptions.lnglat.lat])
          .addTo(mapRef.current)
          .on("dragend", () => {
            if (
              markersList.current.length === markersOptionsList.current.length
            ) {
              const updatedMarkersModel = [];
              for (let n = markersList.current.length - 1; n >= 0; n--) {
                const markerModel = markersList.current[n];
                const markerOptionsModel = markersOptionsList.current[n];
                const markerNewCoordinates = markerModel.getLngLat();
                updatedMarkersModel.push({
                  ...markerOptionsModel,
                  lnglat: markerNewCoordinates,
                });
              }
              modelUpdate({ markers: updatedMarkersModel });
            } else {
              throw Error("markersList and markersOptionsList are not in sync");
            }
          });

        markersList.current.push(marker);
        markersOptionsList.current.push(markerOptions);
      }
    }
  };

  const updateMarkersModel = () => {};

  // initial hook
  useEffect(() => {
    mapboxgl.accessToken = model.mapboxAccessToken;
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 0,
      projection: "globe",
    });
    // add navigation control
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // save map instance to ref
    mapRef.current = map;

    // prep basemap
    map.on("load", () => {
      reloadBasemapList();
      // choose mapbox streets as basemap on load
      setBasemapId(basemapList.current[0]?.id);

      reloadOverlayList();

      reloadMarkers();
    });
  }, [mapContainer]);

  // basemap hook
  useEffect(() => {
    reloadBasemapList();
  }, [model.basemaps]);

  // overlay hook
  useEffect(() => {
    reloadOverlayList();
  }, [model.overlays]);

  // markers hook
  useEffect(() => {}, [model.markers]);

  // item change hook
  useEffect(() => {
    reloadMarkers();
  }, [model.itemId]);

  const handleBasemapIdChange = (e) => {
    setBasemapId(e.target.value);
    //find an item with the name being set
    const basemapItem = basemapList.current.find(
      (item) => item.id === e.target.value,
    );
    if (basemapItem.type === "style") {
      mapRef.current.setStyle(basemapItem.url);
    } else {
      throw new Error(
        `Basemap ${basemapItem.id} is of type "${basemapItem.type}, yet only "style" is implemented`,
      );
    }
  };

  const handleOverlayIdChange = (e) => {
    setOverlayId(e.target.value);
    if (e.target.value) {
      const overlayItem = overlayList.current.find(
        (item) => item.id === e.target.value,
      );

      if (mapRef.current.getLayer("overlay")) {
        mapRef.current.removeLayer("overlay");
      }
      if (mapRef.current.getSource("overlay")) {
        mapRef.current.removeSource("overlay");
      }

      mapRef.current.addLayer({
        ...overlayItem,
        id: "overlay",
      });
    }
  };

  return (
    <div>
      <div id="map" ref={mapContainer} style={{ zIndex: 0 }}></div>

      <Box
        sx={{
          position: "absolute",
          width: "70vw",
          margin: "1vw",
          bgcolor: "white",
          borderRadius: "5px",
          zIndex: 1,
        }}
      >
        <FormControl size="small" sx={{ width: "48%", m: "2% 1% 1.5%" }}>
          <InputLabel id="basemap-select-label">Basemap</InputLabel>
          <Select
            labelId="basemap-select-label"
            id="basemap-select"
            value={basemapId}
            label="Basemap"
            onChange={handleBasemapIdChange}
          >
            {basemapList.current &&
              basemapList.current.map((basemapItem) => (
                <MenuItem key={basemapItem.id} value={basemapItem.id}>
                  {basemapItem.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <FormControl
          size="small"
          sx={{ margin: "10px", width: "48%", m: "2% 1% 1.5%" }}
        >
          <InputLabel id="overlay-select-label">Overlay</InputLabel>
          <Select
            id="overlay-select"
            labelId="overlay-select-label"
            value={overlayId}
            label="Overlay"
            onChange={handleOverlayIdChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {overlayList.current &&
              overlayList.current.map((overlayItem) => (
                <MenuItem key={overlayItem.id} value={overlayItem.id}>
                  {overlayItem.name || overlayItem.id}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
    </div>
  );
};
export default MapComponent;
