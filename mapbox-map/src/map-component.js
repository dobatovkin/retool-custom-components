import React, { useRef, useEffect, useState } from "react";

import { Box, Button, Divider, TextField, Typography } from "@mui/material";

import mapboxgl from "mapbox-gl";

/**
 * @type MapComponentModel
 * @property
 */

/**
 *
 * @param {*} param0
 * @returns
 */
const MapComponent = ({ triggerQuery, model, modelUpdate }) => {
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
    // Check if the map is initialized
    if (mapRef.current && model.itemId) {
      // Fit the map to the bounding box
      mapRef.current.flyTo({
        center: [model.longitude, model.latitude],
        zoom: 18,
      });
    }
  }, [model]);
  return (
    <div>
      <div id="map" ref={mapContainerRef}></div>
    </div>
  );
};
export default MapComponent;
