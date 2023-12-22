import React, { useRef, useEffect, useState } from "react";

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  CircularProgress,
} from "@mui/material";

import mapboxgl from "!mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";

import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import isEqual from "lodash.isequal";
import LegendControl from "mapboxgl-legend";
import "mapboxgl-legend/dist/style.css";

import calculateGeojsonBbox from "@turf/bbox";

/**
 * Extended Mapbox GL JS Layer with component-specific properties.
 * @typedef {object} MapComponentLayer
 * @extends import("mapbox-gl").Layer
 * @property {string} [metadata.name] - Name for display on the legend and on the menus
 * @property {import("mapbox-gl").extendsBoundsLike} [metadata.bbox] - Bounding box for current layer. If not provided, component will try to get it from geojson bbox property, if there is no a compure it.
 */

/**
 * Basemap to be displayed under all other layers. Only Mabox GL Styles are currently supported.
 * @typedef {object} MapComponentBasemap
 * @property {string} id - Unique ID of the basemap
 * @property {string} type - Basemap type. Currently, only `style` is suppurted
 * @property {import("mapbox-gl").Style} data Basemap data. Currently, only Mapbox Styles are supported
 * @property {string} [name] - Name to display in the menus
 */

/**
 * @typedef {object} MapComponentCurrentCenter
 * @extends import("mapbox-gl").LngLat
 * @property {number} z - Map current zoom
 */

/**
 * @typedef {object} MapComponentSelectedFeature
 * @property {object} properties - Properties of the selected feature
 * @property {object} geometry - Selected feature geometry
 */

/**
 * @typedef {object} MapComponentModel
 * @property {string} mapboxAccessToken - [input] Access token for Mapbox GL JS
 * @property {string} itemId - [input] ID of the current selected item in Retool. Change causes item-specific layers and markers to rerender.
 * @property {MapComponentBasemap[]} [basemaps] - [input] Array of basemaps to be displayed
 * @property {MapComponentLayer[]} [layers] - Array of layers to display. It is intented to be used for layers that change on item's change.
 * @property {import("mapbox-gl").MarkerOptions[]} [markers] - [input] Array of markers to display.
 * @property {import("mapbox-gl").Layer[]} [overlays] - [input] Array of toggable layers.
 * @property {import("mapbox-gl").MarkerOptions[]} [updatedMarkers]- [output] Array of markers with updated coordinates.
 * @property {MapComponentSelectedFeature} [selectedFeature] - [output] Properties and coordinates of the feature that have been clicked on.
 * @property {MapComponentCurrentCenter} [mapCenter] - [output] Map current position center and zoom. Updates on evere map move end event.
 */

//
const MapComponent = ({ triggerQuery, model, modelUpdate }) => {
  const CUSTOM_LAYER_PREFIX = "_custom-";
  const OVERLAY_LAYER_PREFIX = "_overlay-";

  const FIT_BOUNDS_OPTIONS = {
    padding: 150,
    speed: 8,
    maxZoom: 18.5,
  };

  // map object
  const mapRef = useRef(null);
  // html map container
  const mapContainer = useRef(null);
  // array of basemaps to choose with properties
  const basemapList = useRef([]);
  // array of overlays to choose with properties
  const overlayOptionsList = useRef([]);
  // active basemap state
  const [basemapId, setBasemapId] = useState("");
  // active overlay state
  const [overlayList, setOverlayList] = useState([]);
  // list of markers that have been added to the map
  const markersList = useRef([]);
  // list of markers from model with their properties
  const markersOptionsList = useRef([]);
  // array of layers to readd after basemap change: includes only ones that are added after root layer,
  // which separates basemap (style) layers from others
  const reloadLayersList = useRef([]);
  // array of sources to readd after basemap change: includes all that are referenced in reloadLayersList
  const reloadSourcesList = useRef([]);
  // state of loading to show progress indicator
  const [loading, setLoading] = useState(false);
  // timer ref for loading indicator
  const loadingTimerRef = useRef(null);
  // active instance of LegendControl to manipulate
  const legendRef = useRef(null);

  const reloadBasemapList = () => {
    basemapList.current = [
      {
        id: "mapbox-streets-v12",
        name: "Mapbox Streets",
        type: "style",
        data: "mapbox://styles/mapbox/streets-v12",
      },
      {
        id: "mapbox-satellite-v9",
        name: "Mapbox Satellite",
        type: "style",
        data: "mapbox://styles/mapbox/satellite-v9",
      },
    ];
    // add basemaps from model
    for (const basemapItem of model.basemaps) {
      basemapList.current.push(basemapItem);
    }
  };

  const reloadOverlayOptionsList = () => {
    overlayOptionsList.current = [];
    for (const overlayItem of model.overlays) {
      overlayOptionsList.current.push(overlayItem);
    }
  };

  const reloadMarkers = () => {
    if (mapRef.current.isStyleLoaded() && model.markers) {
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
              for (let n = 0; n <= markersList.current.length - 1; n++) {
                const markerModel = markersList.current[n];
                const markerOptionsModel = markersOptionsList.current[n];
                const markerNewCoordinates = markerModel.getLngLat();
                updatedMarkersModel.push({
                  ...markerOptionsModel,
                  lnglat: markerNewCoordinates,
                });
              }
              modelUpdate({ updatedMarkers: updatedMarkersModel });
            } else {
              throw Error("markersList and markersOptionsList are not in sync");
            }
          });

        markersList.current.push(marker);
        markersOptionsList.current.push(markerOptions);
      }
    }
  };

  const reloadCustomLayers = () => {
    if (mapRef.current.isStyleLoaded() && model.layers) {
      const style = mapRef.current.getStyle();
      // remove remaining custom layers
      const sourceIdsToRemove = [];
      style.layers.forEach((layer) => {
        if (layer.id.startsWith(CUSTOM_LAYER_PREFIX)) {
          mapRef.current.removeLayer(layer.id);
          sourceIdsToRemove.push(layer.source);
        }
      });
      sourceIdsToRemove.forEach((sourceId) => {
        if (
          !mapRef.current
            .getStyle()
            .layers.some((layer) => layer.source === sourceId)
        ) {
          mapRef.current.removeSource(sourceId);
        }
      });

      // add layers from model
      for (const customLayer of model.layers) {
        // if this layer does not have bbox in his metadata, try to compute it
        if (
          !customLayer.metadata?.bbox &&
          customLayer.source?.type === "geojson"
        ) {
          customLayer.metadata.bbox = mapboxgl.LngLatBounds.convert(
            calculateGeojsonBbox(customLayer.source.data),
          );
        }
        mapRef.current.addLayer({
          ...customLayer,
          id: `${CUSTOM_LAYER_PREFIX}${customLayer.id}`,
        });
      }
    }
  };

  const addEmptyRootLayer = () => {
    mapRef.current.addLayer({
      id: "root",
      type: "circle",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [],
          },
        },
      },
    });
  };

  const setLoadingTillIdle = () => {
    if (loadingTimerRef.current !== null) {
      clearTimeout(loadingTimerRef.current);
    }
    loadingTimerRef.current = setTimeout(() => {
      setLoading(true);
      loadingTimerRef.current = null;
    }, 1000);
    mapRef.current.once("idle", () => {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
      setLoading(false);
    });
  };

  const calculateItemBbox = () => {
    const bbox = new mapboxgl.LngLatBounds(0, 0, 0, 0);
    markersList.current.forEach((marker) => {
      bbox.extend(marker.getLngLat());
    });
    const style = mapRef.current.getStyle();
    style.layers.forEach((layer) => {
      if (layer.id.startsWith(CUSTOM_LAYER_PREFIX) && layer.metadata?.bbox) {
        bbox.extend(layer.metadata.bbox._sw);
        bbox.extend(layer.metadata.bbox._ne);
      }
    });
    return bbox;
  };

  // initial hook
  useEffect(() => {
    mapboxgl.accessToken = model.mapboxAccessToken;
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 0,
      projection: "mercator",
      // transforming each request that relies on internal search resources to include `x-mapbox-source-system` header
      transformRequest: (url, resourceType) => {
        if (
          ["Tile", "Source"].includes(resourceType) &&
          (url.startsWith("https://sites.mapbox.com") ||
            url.startsWith("https://search-lab-services-production.mapbox.com"))
        ) {
          return {
            url: url,
            headers: {
              "x-mapbox-source-system": "datarave-automation",
            },
          };
        }
      },
    });

    // add map controls
    map.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        language: "en",
        reverseGeocode: true,
      }),
      "top-right",
    );

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.addControl(
      new mapboxgl.FullscreenControl({
        container: document.querySelector("body"),
      }),
    );

    map.addControl(new mapboxgl.ScaleControl());

    legendRef.current = new LegendControl({
      highlight: true,
      toggler: true,
      layers: [new RegExp(`^${CUSTOM_LAYER_PREFIX}`)],
      onToggle: (layerId, state) => {
        if (state) {
          const layer = map.getLayer(layerId);
          if (layer.metadata?.bbox) {
            map.fitBounds(
              new mapboxgl.LngLatBounds(
                layer.metadata.bbox._sw,
                layer.metadata.bbox._ne,
              ),
              FIT_BOUNDS_OPTIONS,
            );
          }
        }
      },
    });
    map.addControl(legendRef.current, "bottom-left");

    // save map instance to ref
    mapRef.current = map;

    // prep basemap
    map.on("load", () => {
      reloadBasemapList();
      // choose mapbox streets as basemap on load
      setBasemapId(basemapList.current[0]?.id);

      reloadOverlayOptionsList();

      reloadMarkers();

      reloadCustomLayers();

      map.once("idle", () => {
        map.fitBounds(calculateItemBbox(), FIT_BOUNDS_OPTIONS);
      });
    });

    map.on("moveend", () => {
      const mapCenter = {
        ...map.getCenter(),
        z: map.getZoom(),
      };
      modelUpdate({
        mapCenter: mapCenter,
      });
    });

    map.on("style.load", () => {
      addEmptyRootLayer();
      for (const source of reloadSourcesList.current) {
        if (!map.getSource(source.id)) {
          map.addSource(source.id, source.properties);
        }
      }
      for (const layer of reloadLayersList.current) {
        map.addLayer(layer);
      }
    });

    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point);
      modelUpdate({
        selectedFeature: {
          properties: features[0]?.properties,
          geometry: features[0]?.geometry,
        },
      });
    });
  }, []);

  // the states for proper model update detection for properties that are objects
  const [modelMarkers, setModelMarkers] = useState(null);
  const [modelLayers, setModelLayers] = useState(null);
  const [modelBasemaps, setModelBasemaps] = useState(null);
  const [modelOverlays, setModelOverlays] = useState(null);

  // basemap hook
  useEffect(() => {
    if (isEqual(model.basemaps, modelBasemaps)) {
      return;
    } else {
      setModelBasemaps(model.basemaps);
    }

    reloadBasemapList();
  }, [model.basemaps]);

  // overlay hook
  useEffect(() => {
    if (isEqual(model.overlays, modelOverlays)) {
      return;
    } else {
      setModelOverlays(model.overlays);
    }

    reloadOverlayOptionsList();
  }, [model.overlays]);

  // markers hook
  useEffect(() => {
    if (isEqual(model.markers, modelMarkers)) {
      return;
    } else {
      setModelMarkers(model.markers);
    }

    reloadMarkers();
  }, [model.markers]);

  // custom layers hook
  useEffect(() => {
    if (isEqual(model.layers, modelLayers)) {
      return;
    } else {
      setModelLayers(model.layers);
    }

    reloadCustomLayers();
  }, [model.layers]);

  // item change hook
  useEffect(() => {
    mapRef.current.once("idle", () => {
      reloadMarkers();
      reloadCustomLayers();
      mapRef.current.fitBounds(calculateItemBbox(), FIT_BOUNDS_OPTIONS);
    });
  }, [model.itemId]);

  const handleBasemapIdChange = (e) => {
    setBasemapId(e.target.value);
    //find an item with the name being set
    const basemapItem = basemapList.current.find(
      (item) => item.id === e.target.value,
    );
    if (basemapItem.type === "style") {
      // get current style
      reloadLayersList.current = [];
      reloadSourcesList.current = [];
      const style = mapRef.current.getStyle();
      const rootIndex = style.layers.findIndex((layer) => layer.id === "root");
      for (let i = rootIndex + 1; i <= style.layers.length - 1; i++) {
        const targetLayer = style.layers[i];
        const targetSourceId = targetLayer.source;
        if (!reloadSourcesList.current[targetSourceId]) {
          reloadSourcesList.current.push({
            id: targetSourceId,
            properties: style.sources[targetSourceId],
          });
        }
        reloadLayersList.current.push(targetLayer);
      }
      mapRef.current.setStyle(basemapItem.data);

      setLoadingTillIdle();
    } else {
      throw new Error(
        `Basemap ${basemapItem.id} is of type "${basemapItem.type}, yet only "style" is implemented`,
      );
    }
  };

  const handleOverlayChange = (event) => {
    // if autofill is used, event returns string instead of array
    const overlayActiveLayers =
      typeof event.target.value === "string"
        ? event.target.value.split(",")
        : event.target.value;

    // ? maybe there is a way to make one loop of these two
    // add layers that are missing
    for (const overlayLayerId of overlayActiveLayers) {
      const overlayLayer = overlayOptionsList.current.find(
        (obj) => obj.id === overlayLayerId,
      );
      if (
        !mapRef.current.getLayer(`${OVERLAY_LAYER_PREFIX}${overlayLayer.id}`)
      ) {
        mapRef.current.addLayer({
          ...overlayLayer,
          id: `${OVERLAY_LAYER_PREFIX}${overlayLayer.id}`,
        });
      }
    }
    // remove layers that are turned off
    for (const overlayItem of overlayOptionsList.current) {
      const overlayLayerId = `${OVERLAY_LAYER_PREFIX}${overlayItem.id}`;
      if (
        !overlayActiveLayers.includes(overlayItem.id) &&
        mapRef.current.getLayer(overlayLayerId)
      ) {
        const overlaySourceId = mapRef.current.getLayer(overlayLayerId).source;
        mapRef.current.removeLayer(overlayLayerId);
        // check if source is referenced in any other layer
        if (
          !mapRef.current
            .getStyle()
            .layers.find((layer) => layer.source === overlaySourceId)
        ) {
          mapRef.current.removeSource(overlaySourceId);
        }
      }
    }
    // update overlay state from event
    setOverlayList(overlayActiveLayers);
    setLoadingTillIdle();
  };

  return (
    <div>
      <div id="map" ref={mapContainer} style={{ zIndex: 0 }}></div>

      <Box
        sx={{
          position: "absolute",
          width: loading ? "55vw" : "50vw",
          margin: "1vw",
          zIndex: 1,
          display: "flex",
          justifyContent: "start",
        }}
      >
        <Box sx={{ minWidth: "50vw", bgcolor: "white", borderRadius: "5px" }}>
          <FormControl
            fullWidth
            size="small"
            sx={{ width: "48%", m: "2% 1% 1.5%" }}
          >
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
              multiple
              value={overlayList}
              label="Overlay"
              renderValue={(selected) => {
                return selected
                  .map((overlayItemId) => {
                    const overlayItem = overlayOptionsList.current.find(
                      (obj) => obj.id === overlayItemId,
                    );
                    return overlayItem.metadata?.name || overlayItem.id;
                  })
                  .join(", ");
              }}
              onChange={handleOverlayChange}
            >
              {overlayOptionsList.current.map((overlayItem) => (
                <MenuItem key={overlayItem.id} value={overlayItem.id}>
                  <Checkbox
                    checked={overlayList.indexOf(overlayItem.id) > -1}
                  />
                  <ListItemText
                    primary={overlayItem.metadata?.name || overlayItem.id}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loading && (
          <Box
            sx={{
              width: "5vw",
              padding: "1vw",
            }}
          >
            <CircularProgress size={"2rem"} />
          </Box>
        )}
      </Box>
    </div>
  );
};
export default MapComponent;
