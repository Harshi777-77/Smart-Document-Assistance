import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_MEASUREMENT_ID = "G-3K5CCSEF08"; // replace with your ID

export default function usePageTracking() {
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
