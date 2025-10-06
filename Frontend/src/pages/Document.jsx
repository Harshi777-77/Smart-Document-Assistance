import React, { useEffect, useState } from "react";

const Documents = () => {
    const [docs, setDocs] = useState([]);
    const [message, setMessage] = useState("");
    const user_id = localStorage.getItem("user_id");

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/documents/${user_id}`);
            const data = await res.json();
            if (res.ok) setDocs(data);
            else setMessage(data.error);
        } catch (err) {
            console.error(err);
            setMessage("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/documents/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) fetchDocuments();
            else alert(data.error);
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>My Documents</h1>
            {message && <p>{message}</p>}
            <ul style={{ listStyle: "none", padding: 0 }}>
                {docs.map((doc) => (
                    <li key={doc.id} style={{ marginBottom: "10px" }}>
                        <span>{doc.title}</span> &nbsp;
                        <a href={`http://127.0.0.1:5000/api/documents/view/${doc.id}`} target="_blank" rel="noreferrer">
                            View
                        </a> &nbsp;
                        <button onClick={() => handleDelete(doc.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Documents;