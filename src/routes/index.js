import React from "react";
import {
    Routes,
    Route
} from "react-router-dom";

import Homepage from "../pages/Homepage";
import Claim from "../pages/Claim";

function Router() {
    return (
        <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/claim" element={<Claim />} />
        </Routes>
    )
}

export default Router