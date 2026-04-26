import React, { useState } from 'react';
import ConsumerView from './ConsumerView.jsx';
import MerchantView from './MerchantView.jsx';

const CITIES = [
  { id: 'berlin',    label: 'Berlin 🇩🇪' },
  { id: 'munich',    label: 'Munich 🇩🇪' },
  { id: 'hamburg',   label: 'Hamburg 🇩🇪' },
  { id: 'frankfurt', label: 'Frankfurt 🇩🇪' },
];

export default function App() {
  const [view, setView] = useState('consumer');
  const [city, setCity] = useState('berlin');

  return (
    <div className="app">
      {/* Top Nav */}
      <nav className="topnav">
        <div className="topnav-brand">
          <span className="topnav-logo">🏙️</span>
          <span className="topnav-title">CITY WALLET</span>
          <span className="topnav-sub">DSV · Payone</span>
        </div>

        <div className="topnav-center">
          <button
            className={`tab-btn ${view === 'consumer' ? 'tab-active' : ''}`}
            onClick={() => setView('consumer')}
          >
            📱 Consumer
          </button>
          <button
            className={`tab-btn ${view === 'merchant' ? 'tab-active' : ''}`}
            onClick={() => setView('merchant')}
          >
            🏪 Merchant
          </button>
        </div>

        <div className="topnav-right">
          <select
            className="city-select"
            value={city}
            onChange={e => setCity(e.target.value)}
          >
            {CITIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </nav>

      {/* Content */}
      <main className="main-content">
        {view === 'consumer'
          ? <ConsumerView city={city} />
          : <MerchantView />
        }
      </main>

      {/* Footer */}
      <footer className="app-footer">
        🔒 Privacy by design · No PII collected · GDPR compliant · On-device context sensing
      </footer>
    </div>
  );
}
