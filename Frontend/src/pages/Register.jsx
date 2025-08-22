import React, { useState } from "react";
import axios from "axios";
import "./../style.css";

const API_BASE = "http://127.0.0.1:5000/api";

const Register = () => {
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE}/register`, formData);
            alert(res.data.message);
            window.location.href = "/login";
        } catch (err) {
            console.error(err);
            alert("⚠️ Registration failed");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-box animate-pop">
                <h2>📝 Create Account</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <i className="fas fa-user"></i>
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <i className="fas fa-envelope"></i>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <i className="fas fa-lock"></i>
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-animated">Register</button>
                </form>
                <p>
                    Already have an account? <a href="/login">Login</a>
                </p>
            </div>
        </div>
    );
};

export default Register;
