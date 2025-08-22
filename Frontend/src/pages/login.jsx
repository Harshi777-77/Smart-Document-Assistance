import React, { useState } from "react";
import axios from "axios";
import "./../style.css";


const API_BASE = "http://127.0.0.1:5000/api";

const Login = () => {
    const [formData, setFormData] = useState({ username: "", password: "" });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE}/login`, formData);
            if (res.data.user_id) {
                localStorage.setItem("user_id", res.data.user_id);
                window.location.href = "/dashboard";
            } else {
                alert("⚠️ Invalid credentials");
            }
        } catch (err) {
            console.error(err);
            alert("⚠️ Login failed");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-box animate-pop">
                <h2>🔑 Welcome Back</h2>
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
                    <button type="submit" className="btn-animated">Login</button>
                </form>
                <p>
                    Don’t have an account? <a href="/register">Register</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
