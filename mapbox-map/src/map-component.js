import React, { useRef, useEffect, useState } from "react";

import { Box, Button, Divider, TextField, Typography } from "@mui/material";

import mapboxgl from "!mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFiYXRvdWtpbiIsImEiOiJjbGc0NWFocjMwMmI2M3BycWF3cjlxNmc2In0.PxbxqgSkUxxczkcEx0_VEw";

/* Default component model
  {
    "greeting": "Hello, ",  
    "username": {{ current_user.fullName }},
    "message": "Welcome to custom components!",
    "yesQuery": "yesQuery",
    "noQuery": "noQuery",
    "runQuery": "runQuery"
  }
*/

const MapComponent = ({ triggerQuery, model, modelUpdate }) => {
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-74.5, 40],
      zoom: 9,
    });

    // Add navigation control
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add a marker at the center
    new mapboxgl.Marker().setLngLat([-74.5, 40]).addTo(map);
  });

  return (
    <div>
      <div id="map"></div>
    </div>
  );
};
export default MapComponent;
