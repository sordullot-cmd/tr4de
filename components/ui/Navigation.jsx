"use client";

import { useState } from "react";

export default function Navigation({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
  ];

  return (
    <nav className="nav-bar">
      <style>{`
        .nav-bar {
          display: flex;
          gap: 8px;
          padding: 16px;
          background: #FFFFFF;
          border-bottom: 1px solid #E8E9EF;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .nav-item {
          padding: 10px 16px;
          border-radius: 8px;
          background: transparent;
          color: #6B6C80;
          border: 1px solid transparent;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        
        .nav-item:hover {
          background: #F7F8FA;
          color: #0F0F1A;
        }
        
        .nav-item.active {
          background: #6366F1;
          color: white;
          border-color: #6366F1;
        }
        
        .nav-item.active:hover {
          background: #4F46E5;
          color: white;
        }
      `}</style>
      
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? "active" : ""}`}
          onClick={() => setCurrentPage(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
