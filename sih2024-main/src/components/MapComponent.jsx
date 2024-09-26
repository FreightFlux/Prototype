import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { ImTruck } from "react-icons/im";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/helper/supabaseClient";

const truckIconUrl = "/images/truck.png";
const locationIconUrl = "/images/stop.png";

const MapComponent = () => {
  const { id } = useParams();
  const [map, setMap] = useState(null);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarkers, setEndMarkers] = useState([]);
  const [routeControl, setRouteControl] = useState(null);
  const [routeReady, setRouteReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checkpts, setCheckpts] = useState([]);
  const [checkAdmin, setCheckAdmin] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const truckIcon = L.icon({
    iconUrl: truckIconUrl,
    iconSize: [70, 70],
  });

  const locationIcon = L.icon({
    iconUrl: locationIconUrl,
    iconSize: [40, 40],
  });

  const getCoordinates = async (placeName) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${placeName}&format=json`
    );
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    } else {
      console.error(`Coordinates not found for ${placeName}`);
      return null;
    }
  };

  const fetchloc = async () => {
    const { data: loc, error } = await supabase
      .from("trucks")
      .select("locations")
      .eq("id", id);
    if (!error && loc && loc.length > 0) {
      const convertedCheckpts = await Promise.all(
        loc[0].locations.map(async (location) => {
          const coords = await getCoordinates(location.place);
          return {
            ...location,
            lat: coords ? coords.lat : null,
            lon: coords ? coords.lon : null,
          };
        })
      );
      setCheckpts(convertedCheckpts);
    }
  };

  const fetchAdmin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: userRole, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (roleError) {
        console.error(roleError);
        return;
      }
      if (userRole.role === "admin") {
        setCheckAdmin(true);
      } else {
        setCheckAdmin(false);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchloc();
    fetchAdmin();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (checkpts.length > 0 && !map) {
      const mapInstance = L.map("map").setView(
        [checkpts[0].lat, checkpts[0].lon],
        14
      );
      L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
        attribution: "Leaflet &copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapInstance);
      setMap(mapInstance);
    }
  }, [checkpts]);

  useEffect(() => {
    if (!map || checkpts.length === 0) return;


    if (!startMarker && checkpts[0]) {
      const newStartMarker = L.marker([checkpts[0].lat, checkpts[0].lon], {
        icon: truckIcon,
      }).addTo(map);
      setStartMarker(newStartMarker);
    }


    const newEndMarkers = [];
    checkpts.slice(1).forEach((checkpoint) => {
      if (checkpoint.lat && checkpoint.lon) {
        const endMarker = L.marker([checkpoint.lat, checkpoint.lon], {
          icon: locationIcon,
        }).addTo(map);
        newEndMarkers.push(endMarker);
      }
    });
    setEndMarkers(newEndMarkers);

    if (startMarker && newEndMarkers.length > 0) {
      setRouteReady(true);
    }
  }, [map, checkpts, startMarker]);


  useEffect(() => {
    if (!routeReady || !map || !startMarker || endMarkers.length < 1) return;

    const waypoints = [
      L.latLng(startMarker.getLatLng()),
      ...endMarkers.map((marker) => marker.getLatLng()),
    ];

    if (!routeControl) {
      const control = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
        createMarker: () => null,
        addWaypoints: false,
        draggableWaypoints: false,
      }).addTo(map);

      setRouteControl(control);
    } else {
      routeControl.setWaypoints(waypoints);
    }
  }, [routeReady, map, startMarker, endMarkers, routeControl]);


  useEffect(() => {
    if (
      !journeyStarted ||
      !routeReady ||
      !map ||
      !startMarker ||
      endMarkers.length < 1
    ) {
      return;
    }

    const waypoints = [
      L.latLng(startMarker.getLatLng()),
      ...endMarkers.map((marker) => marker.getLatLng()),
    ];


    if (!routeControl) {
      const control = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
        createMarker: () => null,
        addWaypoints: false,
        draggableWaypoints: false,
      }).addTo(map);

      setRouteControl(control);

      control.on("routesfound", (e) => {
        const shortestRoute = e.routes[0];
        const coordinates = shortestRoute.coordinates;

        const moveTruck = async (coords, index) => {
          if (index < coords.length) {
            startMarker.setLatLng([coords[index].lat, coords[index].lng]);

            const isCheckpoint = endMarkers.some((marker) =>
              marker
                .getLatLng()
                .equals([coords[index].lat, coords[index].lng])
            );

            if (isCheckpoint) {
              await new Promise((resolve) => setTimeout(resolve, 10000));
            }

            setTimeout(() => moveTruck(coords, index + 1), 100);
          } else {
            setTimeout(() => {
              setShowModal(true);
            }, 500);
          }
        };

        moveTruck(coordinates, 0);
      });
    } else {
      routeControl.setWaypoints(waypoints);

      routeControl.on("routesfound", (e) => {
        const shortestRoute = e.routes[0];
        const coordinates = shortestRoute.coordinates;

        const moveTruck = async (coords, index) => {
          if (index < coords.length) {
            startMarker.setLatLng([coords[index].lat, coords[index].lng]);

            const isCheckpoint = endMarkers.some((marker) =>
              marker
                .getLatLng()
                .equals([coords[index].lat, coords[index].lng])
            );

            if (isCheckpoint) {
              await new Promise((resolve) => setTimeout(resolve, 10000));
            }

            setTimeout(() => moveTruck(coords, index + 1), 100);
          } else {
            setTimeout(() => {
              setShowModal(true);
            }, 500);
          }
        };

        moveTruck(coordinates, 0);
      });
    }
  }, [
    journeyStarted,
    routeReady,
    map,
    startMarker,
    endMarkers,
    routeControl,
  ]);

  const handleStartJourney = () => {
    setJourneyStarted(true);
  };

  const handleClose = () => setShowModal(false);

  return (
    <div className="max-w-[1300px] mx-auto">

      {!checkAdmin && (
        <button
          onClick={handleStartJourney}
          className="px-4 py-2 ring-1 ring-[#046a51] flex items-center justify-start gap-3"
        >
          <ImTruck className="text-[#046a51]" size={20} />
          <p className="text-[#046a51] font-bold text-lg">Start Journey</p>
        </button>
      )}


      {checkAdmin && (
        <div className="text-center text-lg font-bold text-[#046a51]">
          Admin View: You can view the route but cannot start the journey.
        </div>
      )}

      <div
        id="map"
        className="w-[70%] h-[70vh] mx-auto my-[1.5rem] rounded-lg ring-1 ring-[#046a51]"
      ></div>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Destination Reached</Modal.Title>
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
    </div>
  );
};

export default MapComponent;
