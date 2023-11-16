import React from 'react';
import ReactDOM from 'react-dom';
import MapComponent from "./map-component";
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css'

const RetoolConnectedComponent = Retool.connectReactComponent(MapComponent);
ReactDOM.render(
  <RetoolConnectedComponent/>, 
  document.body.appendChild(document.createElement('div')) 
);