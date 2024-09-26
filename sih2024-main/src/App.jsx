
import React from "react";
import MapComponent from "./components/MapComponent";
import Navbar from "./components/Navbar"
import Home from "./components/Home";
import Dashboard from "./Admin/Dashboard";
import { Route, Routes } from "react-router-dom";
import DriverDashboard from "./components/driverdashboard";

function App() {
  return (
    <>
      <div className="">
        {/* <div className="App">
          <h1 className="text-2xl font-bold mb-4 text-center">Geolocation Map with Taxi Movement</h1>
          <MapComponent />
        </div> */}
        <Navbar />
        <Routes>
          <Route path="/" element={<div> <Home /> </div>} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/map/:id" element={<MapComponent />} />
          <Route path="/driver/map/:id" element={<MapComponent />} />
        </Routes>
      </div>
    </>
  )
}

export default App;
