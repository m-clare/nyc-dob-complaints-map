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
import maptiler3dGl from "../assets/positron-style.json";
import complaintCategory from "../assets/dobcomplaints_complaint_category.json";
import dobComplaints2021 from "../assets/complaint_category.json";
import { activeComplaints } from "../assets/active_complaints";
import HUD from "./HUD";

import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import GitHubIcon from "@mui/icons-material/GitHub";

const filteredComplaints = new Set(activeComplaints);

const descriptionMap2021 = new Map(
  dobComplaints2021
    .filter((d) => filteredComplaints.has(d["COMPLAINT CATEGORY"]))
    .map((d) => [d["COMPLAINT CATEGORY"], d["COMPLAINT CATEGORY DESCRIPTION"]])
);

const complaintLayersById = [
  ...dobComplaints2021
    .map((d) => `nyc-${d["COMPLAINT CATEGORY"]}`)
    .filter((d) => filteredComplaints.has(d.split("-")[1])),
];

const priorityMap = new Map(complaintCategory.map((d) => [d.CODE, d.PRIORITY]));

interface LayerVisibility {
  id: string;
  visible: boolean;
}

const circleColors = [
  "match",
  ["get", "highestPriority"],
  "A",
  "#e31a1c",
  "B",
  "#fd8d3c",
  "C",
  "#fecc5c",
  "D",
  "#ffffb2",
  "#f2f2f2",
];

const circleRadius = ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 5];

// helper function to create complaintLayers
const getDefaultLayer = (layerId: string) => {
  return {
    id: `${layerId}`,
    type: "circle",
    source: "dobTiles",
    "source-layer": "20241116_nycdob_rollup",
    layout: { visibility: "visible" },
    paint: {
      "circle-color": circleColors,
      "circle-opacity": 0.9,
      "circle-radius": circleRadius,
    },
  } as CircleLayerSpecification;
};

// helper function to create complaintLayers
const getComplaintLayer = (layerId: string) => {
  const complaintId = layerId.split("-")[1];
  return {
    id: `${layerId}`,
    type: "circle",
    source: "dobTiles",
    "source-layer": "20241116_nycdob_rollup",
    filter: [
      "all",
      [
        "in",
        complaintId,
        ["get", "complaintCategories"],
      ] as ExpressionSpecification,
    ] as ExpressionFilterSpecification,
    layout: { visibility: "visible" },
    paint: {
      "circle-color": circleColors,
      "circle-opacity": 0.9,
      "circle-radius": circleRadius,
    },
  } as CircleLayerSpecification;
};

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

const LayersVisibilityController = (props: {
  layers: LayerVisibility[];
  onChange: (layers: LayerVisibility[]) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { layers, onChange } = props;

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const toggleLayer = (event: React.ChangeEvent<HTMLInputElement>) => {
    const layerId = event.target.getAttribute("data-layer-id");
    const newLayersVisibility = layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    onChange(newLayersVisibility);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: 8,
        bottom: 108,
      }}
    >
      <Card
        sx={{
          padding: 1,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderRadius: "8px",
        }}
      >
        <div>
          <Typography variant="h7" sx={{ fontVariant: "small-caps" }}>
            Layers
          </Typography>
          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        </div>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ maxHeight: "20vh", overflowY: "auto", maxWidth: "300px" }}>
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
        </Collapse>
      </Card>
    </Box>
  );
};

function MaplibreMap() {
  const [selectedMarkerData, setSelectedMarkerData] = useState({});
  const [hudVisible, setHudVisible] = useState(false);
  let [layersVisibility, setLayersVisibility] = useState<LayerVisibility[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapFile = new PMTiles("/nyc-building-complaints/new-york.pmtiles");
  const dobFile = new PMTiles("/nyc-building-complaints/nyc-buildings.pmtiles");

  const handleSpaceZoom = (event) => {
    if (event.key === " ") {
      const map = mapRef.current;
      if (map) {
        map.flyTo({
          // These options control the ending camera position: centered at
          // the target, at zoom level 9, and north up.
          zoom: 10,

          // These options control the flight curve, making it move
          // slowly and zoom out almost completely before starting
          // to pan.
          speed: 0.5, // make the flying slow
          curve: 1, // change the speed at which it zooms out

          // This can be any easing function: it takes a number between
          // 0 and 1 and returns another number between 0 and 1.
          easing: function (t) {
            return t;
          },

          // this animation is considered essential with respect to prefers-reduced-motion
          essential: true,
        });
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleSpaceZoom);

    return () => document.removeEventListener("keydown", handleSpaceZoom);
  }, []);

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
        glyphs: "/nyc-building-complaints/{fontstack}/{range}.pbf",
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
      const defaultLayer = getDefaultLayer("nyc-dob");
      map.addLayer(defaultLayer, "highway_name_motorway");
      complaintLayersById.forEach((id) => {
        const layer = getComplaintLayer(id);
        map.addLayer(layer, "highway_name_motorway");
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
          sx={{ color: "black", fontVariant: "small-caps" }}
        >
          NYC Department of Buildings
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: "black", fontVariant: "small-caps" }}
        >
          Active Complaints
        </Typography>
      </Box>
      <LayersVisibilityController
        layers={layersVisibility}
        onChange={handleLayersVisibilityChange}
      />
      <Box sx={{ position: "fixed", left: 8, bottom: 72 }}>
        <Link href="https://github.com/m-clare/nyc-dob-complaints-map">
          <GitHubIcon
            sx={{
              color: "grey",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
        </Link>
      </Box>
      {hudVisible && <HUD rawData={selectedMarkerData} />}
    </>
  );
}

export default MaplibreMap;
