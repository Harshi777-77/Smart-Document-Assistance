import React, { useState } from "react";
import api from "../api";

export default function Upload() {
    const [file, setFile] = useState(null);
    const user_id = localStorage.getItem("user_id");

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            alert("Select a file first!");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", user_id);

        try {
            await api.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("File uploaded!");
            window.location.reload();
        } catch (err) {
            alert("Error: " + err.response?.data?.error);
        }
    };

    return (
        <div>
            <h2>Upload File</h2>
            <form onSubmit={handleUpload}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <button type="submit">Upload</button>
            </form>
        </div>
    );
}