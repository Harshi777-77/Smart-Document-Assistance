import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = "G-3K5CCSEF08";

// Tracking hook
function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        if (window.gtag) {
            window.gtag("config", GA_MEASUREMENT_ID, {
                page_path: location.pathname + location.search,
            });
            console.log("📊 GA Pageview:", location.pathname + location.search);
        }
    }, [location]);
}

// Component wrapper for the tracking hook
function PageTracker() {
    usePageTracking();
    return null;
}

function App() {
    return (
        <Router>
            <PageTracker />
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/" element={<Login />} /> {/* Default to login */}
            </Routes>
        </Router>
    );
}

export default App;
