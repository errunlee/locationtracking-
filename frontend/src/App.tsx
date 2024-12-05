import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Icon } from "leaflet";
import { io, Socket } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Custom icon to distinguish different users
const createCustomIcon = (isCurrentUser: boolean) =>
  new Icon({
    iconUrl: isCurrentUser
      ? "https://cdn-icons-png.flaticon.com/512/447/447031.png" // Blue marker for current user
      : "https://img.icons8.com/color/48/marker--v1.png", // Red marker for other users
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });

type MarkerType = {
  id: string;
  latitude: number;
  longitude: number;
};

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Establish socket connection
  useEffect(() => {
    const newSocket = io("https://locationtracking-oqi9.onrender.com", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      // Store the current user's socket ID
      setCurrentUserId(newSocket.id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle incoming location updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveLocation = (data: MarkerType) => {
      setMarkers((prevMarkers) => {
        // Remove existing marker for this user and add updated location
        const filteredMarkers = prevMarkers.filter(
          (marker) => marker.id !== data.id
        );
        return [...filteredMarkers, data];
      });
    };

    socket.on("receive-location", handleReceiveLocation);

    return () => {
      socket.off("receive-location", handleReceiveLocation);
    };
  }, [socket]);

  // Get and send current location
  const getLocation = useCallback(() => {
    if (!socket) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = {
          latitude,
          longitude,
        };

        // Emit location to server
        socket.emit("send-location", locationData);
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 2000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [socket]);

  // Start watching location when socket is ready
  useEffect(() => {
    if (socket) {
      const cleanup = getLocation();
      return cleanup;
    }
  }, [socket, getLocation]);

  // Determine center of map based on current user's location or first marker
  const mapCenter =
    markers.length > 0
      ? [markers[0].latitude, markers[0].longitude]
      : [27.68895, 85.343984]; // Default to Kathmandu if no markers

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <p className="fixed top-5 right-5 z-[2000] text-xl bg-black rounded-lg opacity-70 text-white p-2 px-4">
        Total online: {markers.length}
      </p>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={createCustomIcon(marker.id === currentUserId)}
          >
            <Popup>
              User ID: {marker.id === currentUserId ? "You" : marker.id}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
