import React, { useState } from "react";

function UserSelect() {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = () => {
        if (!file) {
            alert("Please select a file first!");
            return;
        }
        console.log("Uploading:", file.name);
        // 👉 Here you’ll call backend API for upload
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Upload File</h2>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>

            {file && <p>Selected file: {file.name}</p>}
        </div>
    );
}

export default UserSelect;
