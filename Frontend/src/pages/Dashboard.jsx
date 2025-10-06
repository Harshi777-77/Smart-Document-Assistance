import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUpload, FaTrash, FaEye, FaSignOutAlt, FaTimes, FaGoogleDrive } from "react-icons/fa";
import useDrivePicker from "react-google-drive-picker";
import "./../style.css";
import "../pages/dashboard.css";

const API_BASE = "http://127.0.0.1:5000/api";

const Dashboard = () => {
    const [userId, setUserId] = useState(null);
    const [file, setFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [viewDoc, setViewDoc] = useState(null);

    // Google Drive Picker hook
    const [openPicker] = useDrivePicker();

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

            fetchDocuments(userId);
            setFile(null);
        } catch (err) {
            console.error(err);
            alert("⚠️ Upload failed");
        }
    };

    const handleDriveUpload = () => {
        openPicker({
            clientId: "464514685913-jqi8sl325cd5iuolhvi3jcm0m9njmkh0.apps.googleusercontent.com",
            developerKey: "AIzaSyDbpcPen8_BTWSzoXZCwcoA3jlIvEs1UWI",
            viewId: "DOCS",
            showUploadView: true,
            showUploadFolders: true,
            supportDrives: true,
            multiselect: false,
            callbackFunction: async (data) => {
                if (data.action === "picked") {
                    const fileData = data.docs[0];
                    const accessToken = gapi.auth.getToken().access_token;

                    try {
                        await axios.post(`${API_BASE}/upload/drive`, {
                            user_id: userId,
                            file_id: fileData.id,
                            access_token: accessToken,
                        });

                        fetchDocuments(userId);
                    } catch (err) {
                        console.error(err);
                        alert("⚠️ Google Drive upload failed");
                    }
                }
            },
        });
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
            <header className="app-header">
                <h1>📂 Smart Document Assistance</h1>
            </header>

            <h2>Welcome to Dashboard🎉</h2>

            <div className="upload-options">
                <div className="upload-form">
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                    <button onClick={handleUpload} className="btn upload">
                        <FaUpload /> Upload
                    </button>
                </div>

                <div className="drive-upload">
                    <button onClick={handleDriveUpload} className="btn drive-upload-btn">
                        <FaGoogleDrive /> Upload from Google Drive
                    </button>
                </div>
            </div>

            <div className="files-container">
                {documents.length === 0 ? (
                    <p className="no-files">No documents uploaded yet.</p>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="file-box">
                            <h3>{doc.title || "Untitled Document"}</h3>
                            {doc.extracted_text && (
                                <p className="extracted-text">{doc.extracted_text}</p>
                            )}
                            <p className="file-path">{doc.file_path}</p>
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

            {viewDoc && (
                <div className="modal">
                    <div className="modal-content">
                        {viewDoc.type.startsWith("image/") ? (
                            <img src={viewDoc.url} alt="Uploaded file" style={{ maxWidth: "100%", maxHeight: "500px" }} />
                        ) : viewDoc.type === "application/pdf" ? (
                            <iframe src={viewDoc.url} title="PDF Preview" width="300%" height="800px" />
                        ) : viewDoc.type.startsWith("text/") ? (
                            <iframe src={viewDoc.url} title="Text Preview" width="400%" height="800px" />
                        ) : (
                            <p>⚠️ Preview not available for this file type.</p>
                        )}

                        <button className="btn close" onClick={() => setViewDoc(null)}>
                            <FaTimes /> Close
                        </button>
                    </div>
                </div>
            )}

            <button className="btn logout" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
            </button>
        </div>
    );
};

export default Dashboard;
