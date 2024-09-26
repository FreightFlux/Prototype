import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";

const OPEN_CAGE_API_KEY = "1a0fcddba95d45ffb04a7bb6ff1329df";
const TRUCK_ICON_URL = "/images/truck.png";
const STOP_ICON_URL = "/images/stop.png";
const TRAFFIC_ICON_URL = "/images/traffic.png"; // Add traffic icon URL

// Traffic locations for rerouting simulation
const TRAFFIC_LOCATIONS = [
  { lat: 22.9351, lng: 88.5294 }, // Example traffic points
  { lat: 22.9823, lng: 88.4467 },
];

// Function to fetch coordinates from OpenCage API
const getCoordinatesFromPlace = async (placeName) => {
  try {
    const response = await axios.get("https://api.opencagedata.com/geocode/v1/json", {
      params: { key: OPEN_CAGE_API_KEY, q: placeName },
    });
    const { results } = response.data;
    if (results && results.length > 0) {
      return {
        lat: results[0].geometry.lat,
        lng: results[0].geometry.lng,
      };
    }
    throw new Error(`Could not find coordinates for ${placeName}`);
  } catch (error) {
    console.error("Error fetching coordinates from place:", error);
  }
};

// Component to handle routing and traffic rerouting
const RoutingMachine = ({ waypoints, onRouteReady }) => {
  const map = useMap();

  // Define custom icons
  const truckIcon = L.icon({
    iconUrl: TRUCK_ICON_URL,
    iconSize: [60, 60],
  });
  const stopIcon = L.icon({
    iconUrl: STOP_ICON_URL,
    iconSize: [40, 40],
  });
  const trafficIcon = L.icon({
    iconUrl: TRAFFIC_ICON_URL,
    iconSize: [40, 40],
  });

  const truckMarkerRef = useRef(null);
  const finalDestinationReached = useRef(false);
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length === 0) return;

    let routeLine = [];
    let isMoving = false;

    // Remove existing truck marker if any
    if (truckMarkerRef.current) {
      truckMarkerRef.current.remove();
    }

    // Add truck marker at the starting point
    truckMarkerRef.current = L.marker(waypoints[0], { icon: truckIcon }).addTo(map);

    // Add stop markers
    waypoints.slice(1).forEach((coord) => L.marker(coord, { icon: stopIcon }).addTo(map));

    // Add traffic markers
    TRAFFIC_LOCATIONS.forEach((trafficLocation) =>
      L.marker([trafficLocation.lat, trafficLocation.lng], { icon: trafficIcon }).addTo(map)
    );

    // Initialize routing control
    const routingControl = L.Routing.control({
      waypoints: waypoints.map((coord) => L.latLng(coord[0], coord[1])),
      routeWhileDragging: false,
      addWaypoints: false,
      lineOptions: { styles: [{ color: "blue", weight: 4 }] },
      createMarker: () => null,
    })
      .on("routesfound", (e) => {
        if (isMoving) return;
        routeLine = e.routes[0].coordinates;
        console.log("Route found:", routeLine);
        onRouteReady(routeLine);
        isMoving = true;
        moveAlongRoute(routeLine); // Start moving along the route
      })
      .addTo(map);

    // Parameters for movement
    const stepTime = 10; // Smaller step time for smoother movement
    const pauseDuration = 5000; // 5-second pause at each stop

    // Function to interpolate between two points
    const interpolate = (start, end, t) => {
      return {
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      };
    };

    // Function to check proximity to traffic locations
    const rerouteIfTraffic = (latLng) => {
      return TRAFFIC_LOCATIONS.some(
        (traffic) => map.distance(latLng, traffic) < 100
      );
    };

    // Function to move the truck marker along the route
    const moveAlongRoute = (route) => {
      if (route.length === 0) return;
      
      let positionIndex = 0;
      let lastUpdate = performance.now();
      let startLatLng = L.latLng(route[positionIndex]);
      let endLatLng = L.latLng(route[positionIndex + 1]);
      let elapsedTime = 0;
      let totalDistance = map.distance(startLatLng, endLatLng);
      let isPaused = false;
      let pauseEndTime = 0;
      let currentLatLng = startLatLng;
    
      // Draw the route polyline
      const polyline = L.polyline(route, { color: 'blue' }).addTo(map);
      
      // Function to update truck position
      const update = () => {
        const now = performance.now();
        const deltaTime = now - lastUpdate;
        
        if (isPaused) {
          if (now >= pauseEndTime) {
            isPaused = false;
            lastUpdate = now; // Reset the last update time after pause
          }
        } else {
          if (deltaTime > stepTime) {
            lastUpdate = now;
            elapsedTime += deltaTime;
            
            const distance = map.distance(startLatLng, endLatLng);
            const speed = 80; // Speed (in meters per second)
            const travelTime = (distance / speed) * 1000; // in milliseconds
            const stepFactor = Math.min(elapsedTime / travelTime, 1); // Ensure we don’t overshoot
            
            currentLatLng = interpolate(startLatLng, endLatLng, stepFactor);
            truckMarkerRef.current.setLatLng(currentLatLng);
            map.panTo(currentLatLng);
            
            // Check if we've reached the end of this segment
            if (stepFactor >= 1) {
              positionIndex++;
              if (positionIndex < route.length - 1) {
                startLatLng = endLatLng;
                endLatLng = L.latLng(route[positionIndex + 1]);
                elapsedTime = 0;
                
                // Check if we need to pause for traffic
                if (rerouteIfTraffic(currentLatLng)) {
                  isPaused = true;
                  pauseEndTime = now + pauseDuration; // Set pause end time
                }
              } else {
                // Final destination reached
                if (!finalDestinationReached.current) {
                  setShowModal(true);
                  finalDestinationReached.current = true;
                }
                return;
              }
            }
          }
        }
        
        requestAnimationFrame(update); // Continue updating in the next frame
      };
      
      // Start the animation
      requestAnimationFrame(update);
    };
    
    

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, waypoints, onRouteReady]);

  return (
    <>
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Final Destination Reached</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Congratulations! You have reached your destination.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// Main Map Component
const MapWithRoutingMachine = () => {
  const [waypoints, setWaypoints] = useState(null);
  const [started, setStarted] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchCoordinates = async () => {
      const startPlace = "Kalyani, Nadia, India"; // Static start location
      const places = [
        "Kanchrapara, West Bengal, India",
        "Naihati, West Bengal, India",
      ]; // List of stops

      try {
        const startCoordinates = await getCoordinatesFromPlace(startPlace);
        const stopCoordinates = await Promise.all(
          places.map((place) => getCoordinatesFromPlace(place))
        );
        const formattedWaypoints = [
          [startCoordinates.lat, startCoordinates.lng],
          ...stopCoordinates.map((coord) => [coord.lat, coord.lng]),
        ];

        setWaypoints(formattedWaypoints);
      } catch (error) {
        console.error("Error fetching coordinates:", error);
      }
    };

    fetchCoordinates();
  }, []);

  const handleRouteReady = (route) => {
    console.log("Route ready:", route);
  };

  const handleStart = () => {
    setStarted(true);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", height: "80vh", marginBottom: "10px" }}>
          <MapContainer
            center={[22.9351, 88.5294]} // Default center location
            zoom={18}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {started && waypoints && <RoutingMachine waypoints={waypoints} onRouteReady={handleRouteReady} />}
          </MapContainer>
        </div>
        <Button variant="primary" onClick={handleStart} disabled={started}>
          Start Route
        </Button>
      </div>
    </>
  );
};

export default MapWithRoutingMachine;
