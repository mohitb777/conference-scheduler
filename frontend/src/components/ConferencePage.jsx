import React from "react";
import { useNavigate } from "react-router-dom";
import ramsitaLogo from '/src/assets/ramsita-logo.png';
import bgImg from '/src/assets/bgimg.png';

function ConferencePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white overflow-y-auto" style={{
      backgroundImage: `url(${bgImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      {/* Logo Section */}
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <img 
          src={ramsitaLogo} 
          alt="RAMSITA Conference Logo" 
          className="w-80 h-80 object-contain rounded-full shadow-lg transform hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 text-center py-8">
        <h2 className="text-3xl font-bold mb-4">
          1<sup>st</sup> International Conference on
        </h2>
        <h2 className="text-3xl font-bold mb-8">
          Recent Advancement and Modernization in Sustainable Intelligent
          Technologies & Applications (RAMSITA - 2025)
        </h2>
        <p className="mb-8 text-lg">
          Organized in Hybrid Mode by Acropolis Institute of Technology and
          Research, Indore, MP, India
        </p>
        <p className="mb-8 text-lg font-semibold">February 07-08, 2025</p>
        <p className="mb-8 text-lg">
          Proceedings will be published by Springer Nature
        </p>
        <button 
          onClick={() => navigate('/schedule')}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded transform hover:scale-105 transition-transform duration-300"
        >
          Presentation Schedule
        </button>
      </main>
    </div>
  );
}

export default ConferencePage;