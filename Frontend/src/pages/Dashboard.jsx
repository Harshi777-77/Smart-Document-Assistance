import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUpload, FaTrash, FaEye, FaSignOutAlt, FaTimes } from "react-icons/fa";
import "./../style.css";
import "../pages/dashboard.css";

const API_BASE = "http://127.0.0.1:5000/api";

const Dashboard = () => {
    const [userId, setUserId] = useState(null);
    const [file, setFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [viewDoc, setViewDoc] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user_id");
        if (!storedUser) {
            window.location.href = "/login";
            return;
        }
        setUserId(storedUser);
        fetchDocuments(storedUser);
    }, []);

    const fetchDocuments = async (uid) => {
        try {
            const res = await axios.get(`${API_BASE}/documents/${uid}`);
            setDocuments(res.data);
        } catch (err) {
            console.error(err);
            alert("⚠️ Failed to fetch documents");
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("⚠️ Please select a file first");

        try {
            const formData = new FormData();
            formData.append("user_id", userId);
            formData.append("file", file);

            const res = await axios.post(`${API_BASE}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert(res.data.message);
            setFile(null);
            fetchDocuments(userId);
        } catch (err) {
            console.error(err);
            alert("⚠️ Upload failed");
        }
    };

    const handleDelete = async (docId) => {
        try {
            await axios.delete(`${API_BASE}/documents/${docId}`);
            setDocuments(documents.filter((d) => d.id !== docId));
        } catch (err) {
            console.error(err);
            alert("⚠️ Failed to delete document");
        }
    };

    const handleView = async (docId) => {
        try {
            const res = await axios.get(`${API_BASE}/documents/view/${docId}`, {
                responseType: "blob",
            });

            const fileURL = window.URL.createObjectURL(res.data);
            const mimeType = res.data.type;
            setViewDoc({ url: fileURL, type: mimeType });
        } catch (err) {
            console.error(err);
            alert("⚠️ Failed to view document");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user_id");
        window.location.href = "/login";
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="app-header">
                <h1>📂 Smart Document Assistance</h1>
            </header>

            <h2>Welcome to Dashboard🎉</h2>

            {/* Upload */}
            <div className="upload-form">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <button onClick={handleUpload} className="btn upload">
                    <FaUpload /> Upload File
                </button>
            </div>

            {/* Documents */}
            <div className="files-container">
                {documents.length === 0 ? (
                    <p className="no-files">No documents uploaded yet.</p>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="file-box">
                            <h3>{doc.title || "Untitled Document"}</h3>
                            <p>{doc.file_path}</p>
                            <button className="btn upload" onClick={() => handleView(doc.id)}>
                                <FaEye /> View
                            </button>
                            <button className="btn delete" onClick={() => handleDelete(doc.id)}>
                                <FaTrash /> Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modal View */}
            {viewDoc && (
                <div className="modal">
                    <div className="modal-content">
                        {viewDoc.type.startsWith("image/") ? (
                            <img
                                src={viewDoc.url}
                                alt="Uploaded file"
                                style={{ maxWidth: "100%", maxHeight: "500px" }}
                            />
                        ) : viewDoc.type === "application/pdf" ? (
                            <iframe
                                src={viewDoc.url}
                                title="PDF Preview"
                                width="300%"
                                height="800px"
                            />
                        ) : viewDoc.type.startsWith("text/") ? (
                            <iframe
                                src={viewDoc.url}
                                title="Text Preview"
                                width="400%"
                                height="800px"
                            />
                        ) : (
                            <p>⚠️ Preview not available for this file type.</p>
                        )}

                        <button className="btn close" onClick={() => setViewDoc(null)}>
                            <FaTimes /> Close
                        </button>
                    </div>
                </div>
            )}

            {/* Logout */}
            <button className="btn logout" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
            </button>
        </div>
    );
};

export default Dashboard;
