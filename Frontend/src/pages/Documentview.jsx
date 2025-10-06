import React from "react";
import { viewDocument } from "../api";

export default function DocumentView({ doc, onBack }) {
    if (!doc) return <p>No document selected</p>;

    return (
        <div>
            <h2>{doc.title}</h2>
            <iframe src={viewDocument(doc.id)} width="600" height="400" title="document"></iframe>
            <br />
            <button onClick={onBack}>Back</button>
        </div>
    );
}