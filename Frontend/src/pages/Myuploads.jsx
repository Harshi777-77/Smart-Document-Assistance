import React, { useEffect, useState } from "react";
import { getDocuments, deleteDocument, viewDocument } from "../api";

export default function MyUploads({ user, onBack, onView }) {
    const [docs, setDocs] = useState([]);

    const loadDocs = async () => {
        const res = await getDocuments(user.user_id);
        setDocs(res);
    };

    useEffect(() => { loadDocs(); }, []);

    const handleDelete = async (id) => {
        await deleteDocument(id);
        loadDocs();
    };

    return (
        <div>
            <h2>My Uploads</h2>
            <ul>
                {docs.map(doc => (
                    <li key={doc.id}>
                        {doc.title}
                        <button onClick={() => onView(doc)}>View</button>
                        <button onClick={() => handleDelete(doc.id)}>Delete</button>
                    </li>
                ))}
            </ul>
            <button onClick={onBack}>Back</button>
        </div>
    );
}
