/**
 * Rwanda's national extent, dependency-free so both browser map code and server
 * routes can share one definition instead of keeping their own drifting copies.
 *
 * Values come from the `fullExtent` published by the official Rwanda Space Agency
 * `Admin_Boundaries` map service in EPSG:4326 (28.861439, -2.840402, 30.900257,
 * -1.046991), rounded outward so no part of the country is ever clipped.
 */
export const RWANDA_BOUNDS: [[number, number], [number, number]] = [[-2.8405, 28.8614], [-1.0469, 30.9004]];

export const RWANDA_BBOX_4326 = { west: 28.8614, south: -2.8405, east: 30.9004, north: -1.0469 };

/** Rwanda plus a small working margin, used to stop the map drifting off the country. */
export const RWANDA_VIEW_BOUNDS: [[number, number], [number, number]] = [[-3.35, 28.35], [-0.55, 31.41]];
