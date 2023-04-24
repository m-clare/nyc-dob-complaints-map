import { useRef, useEffect, useState } from "react";
import maplibregl, {
  CircleLayerSpecification,
  ExpressionFilterSpecification,
  ExpressionSpecification,
} from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { LayerSpecification } from "maplibre-gl";
import { Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "../styles/Home.module.css";
import maptiler3dGl from "../assets/dark-matter-style.json";
import complaintCategory from "../assets/dobcomplaints_complaint_category.json";
import dobComplaints2021 from "../assets/complaint_category.json";
import HUD from "./HUD";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const descriptionMap2021 = new Map(
  dobComplaints2021.map((d) => [
    d["COMPLAINT CATEGORY"],
    d["COMPLAINT CATEGORY DESCRIPTION"],
  ])
);

const complaintLayersById = [
  ...dobComplaints2021.map((d) => `nyc-${d["COMPLAINT CATEGORY"]}`),
];

const priorityMap = new Map(complaintCategory.map((d) => [d.CODE, d.PRIORITY]));

interface LayerVisibility {
  id: string;
  visible: boolean;
}

// helper function to create complaintLayers
const getComplaintLayer = (layerId: string) => {
  const complaintId = layerId.split("-")[1];
  const highestPriority = priorityMap.get(layerId) ?? "E";
  return {
    id: `${layerId}`,
    type: "circle",
    source: "dobTiles",
    "source-layer": "nycdob_rollup",
    filter: [
      "all",
      [
        "in",
        complaintId,
        ["get", "complaintCategories"],
      ] as ExpressionSpecification,
    ] as ExpressionFilterSpecification,
    layout: { visibility: "none" },
    paint: {
      "circle-color": [
        "match",
        highestPriority,
        "A",
        "#6e40aa",
        "B",
        "#417de0",
        "C",
        "#1ac7c2",
        "D",
        "#40f373",
        "#aff05b",
      ],
      "circle-opacity": 0.9,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        1.75,
        11,
        2.5,
        11.5,
        4,
        12,
        3,
        13,
        3,
        20,
        10,
      ],
    },
  } as CircleLayerSpecification;
};

const LayersVisibilityController = (props: {
  layers: LayerVisibility[];
  onChange: (layers: LayerVisibility[]) => void;
}) => {
  const { layers, onChange } = props;

  const toggleLayer = (event: React.ChangeEvent<HTMLInputElement>) => {
    const layerId = event.target.getAttribute("data-layer-id");
    const newLayersVisibility = layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    onChange(newLayersVisibility);
  };

  const toggleAllLayers = () => {};

  return (
    <Box
      sx={{
        position: "fixed",
        right: 24,
        top: 24,
      }}
    >
      <Paper sx={{ paddingY: 2, paddingLeft: 2 }}>
        <Typography variant="h7" sx={{ fontVariant: "small-caps" }}>
          Layers
        </Typography>
        <Box sx={{ maxHeight: "30vh", overflowY: "auto", maxWidth: "300px" }}>
          <List>
            {props.layers.map(({ id, visible }) => {
              const complaintId = id.split("-")[1];
              const description =
                descriptionMap2021.get(complaintId) ?? "All Complaint Types";
              return (
                <li key={id}>
                  <ListItem style={{ paddingLeft: 8 }}>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={toggleLayer}
                      data-layer-id={id}
                    />
                    {description}
                  </ListItem>
                </li>
              );
            })}
          </List>
        </Box>
      </Paper>
    </Box>
  );
};

function MaplibreMap() {
  const [selectedMarkerData, setSelectedMarkerData] = useState({});
  const [hudVisible, setHudVisible] = useState(false);
  let [layersVisibility, setLayersVisibility] = useState<LayerVisibility[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapFile = new PMTiles("/nyc-public-complaints/new-york.pmtiles");
  const dobFile = new PMTiles("/nyc-public-complaints/nyc-rollup.pmtiles");

  const handleLayersVisibilityChange = (
    layersVisibility: LayerVisibility[]
  ) => {
    setLayersVisibility(layersVisibility);
    const map = mapRef.current!;
    for (const { id, visible } of layersVisibility) {
      const visibility = visible ? "visible" : "none";
      map.setLayoutProperty(`${id}`, "visibility", visibility);
    }
  };

  useEffect(() => {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocol.add(mapFile);
    protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocol.add(dobFile);

    const map = new maplibregl.Map({
      container: mapContainerRef.current!,
      center: [-73.935242, 40.73061],
      pitch: 20,
      zoom: 10,
      minZoom: 10,
      maxZoom: 19.9,
      maplibreLogo: true,
      logoPosition: "bottom-left",
      style: {
        version: 8,
        sources: {
          openmaptiles: {
            type: "vector",
            tiles: ["pmtiles://" + mapFile.source.getKey() + "/{z}/{x}/{y}"],
            minzoom: 6,
            maxzoom: 14,
          },
          dobTiles: {
            type: "vector",
            tiles: ["pmtiles://" + dobFile.source.getKey() + "/{z}/{x}/{y}"],
            minzoom: 6,
            maxzoom: 14,
          },
        },
        layers: maptiler3dGl.layers as LayerSpecification[],
        glyphs: "/nyc-public-complaints/{fontstack}/{range}.pbf",
      },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: `<a href="https://protomaps.com">Protomaps</a> | <a href="https://openmaptiles.org">© OpenMapTiles</a> | <a href="http://www.openstreetmap.org/copyright"> © OpenStreetMap contributors</a>`,
      }),
      "bottom-left"
    );
    map.addControl(new maplibregl.NavigationControl({}), "bottom-right");

    map.on("load", function () {
      map.resize();

      const initialLayerVisibility = [{ id: "nyc-dob", visible: true }];
      complaintLayersById.forEach((id) => {
        const layer = getComplaintLayer(id);
        map.addLayer(layer, "highway_name_other");
        initialLayerVisibility.push({
          id: layer.id,
          visible: false,
        });
      });

      setLayersVisibility(initialLayerVisibility);

      ["nyc-dob", ...complaintLayersById].forEach((layer) => {
        map.on("mouseenter", layer, function (e) {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", layer, function (e) {
          map.getCanvas().style.cursor = "";
        });
      });

      map.on("click", function (e) {
        const features = map.queryRenderedFeatures(e.point);
        const feature =
          features.filter((feature) =>
            new Set(["nyc-dob", ...complaintLayersById]).has(feature.layer.id)
          )[0] ?? null;
        if (feature) {
          const point = feature.geometry as Point;
          const coords = point.coordinates as [number, number];
          const id = feature.properties.id;
          setSelectedMarkerData(feature.properties);
          setHudVisible(true);
        } else {
          setSelectedMarkerData({});
          setHudVisible(false);
        }
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <>
      <div ref={mapContainerRef} className={styles.mapContainer}>
        <div ref={mapContainerRef}></div>
      </div>
      <Box sx={{ position: "fixed", left: 8, top: 8 }}>
        <Typography
          variant="h4"
          sx={{ color: "white", fontVariant: "small-caps" }}
        >
          NYC Department of Buildings
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: "white", fontVariant: "small-caps" }}
        >
          Active Complaints
        </Typography>
      </Box>
      <LayersVisibilityController
        layers={layersVisibility}
        onChange={handleLayersVisibilityChange}
      />
      {hudVisible && <HUD rawData={selectedMarkerData} />}
    </>
  );
}

export default MaplibreMap;
