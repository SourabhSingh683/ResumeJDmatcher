import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, Briefcase, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import ResultsDashboard from './components/ResultsDashboard';

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const autofillJD = () => {
    setJobDescription(
      "We are looking for a Full Stack Developer with experience in React, Node.js, and AWS. The ideal candidate should have strong knowledge of JavaScript, Docker, and REST APIs. Experience with cloud deployments and serverless architecture is a plus."
    );
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription) {
      setError("Please provide both a resume PDF and a job description.");
      return;
    }

    setError('');
    setLoading(true);
    setResults(null);

    try {
      // Read file as Base64
      const getBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
      });
      
      const fileBase64 = await getBase64(file);
      const payload = {
        fileBase64,
        filename: file.name,
        jobDescription
      };

      // In a real environment, this should point to your API Gateway URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/analyze-resume';
      
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle both Proxy and Non-Proxy API Gateway responses
      let finalData = response.data;
      if (finalData && typeof finalData.body === 'string') {
        finalData = JSON.parse(finalData.body);
      } else if (finalData && finalData.body) {
        finalData = finalData.body;
      }
      
      if (finalData.error) {
        throw new Error(finalData.error);
      }
      if (finalData.errorMessage) {
        throw new Error(finalData.errorMessage); // Handle AWS Lambda timeouts gracefully
      }

      setResults(finalData);
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || "An error occurred while analyzing the resume. Make sure the backend is running.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-sans p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            AI Resume & JD Matcher
          </h1>
          <p className="text-slate-400 text-lg">
            Optimize your resume for any Applicant Tracking System (ATS).
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Resume Upload Section */}
          <div className="bg-dark-panel p-6 rounded-2xl shadow-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-blue-400" />
              <h2 className="text-xl font-semibold">1. Upload Resume</h2>
            </div>
            
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              {file ? (
                <p className="text-emerald-400 font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
                  <p className="text-slate-500 text-sm mt-1">PDF format only (Max 5MB)</p>
                </>
              )}
            </div>
          </div>

          {/* JD Input Section */}
          <div className="bg-dark-panel p-6 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="text-emerald-400" />
                <h2 className="text-xl font-semibold">2. Job Description</h2>
              </div>
              <button 
                onClick={autofillJD}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition-colors"
              >
                Autofill Sample
              </button>
            </div>
            
            <textarea
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex-grow resize-none min-h-[150px]"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Analyze Button */}
        <div className="flex flex-col items-center justify-center mb-12">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-amber-400 bg-amber-400/10 px-4 py-3 rounded-lg w-full max-w-2xl">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)] ${loading ? 'opacity-70 cursor-not-allowed transform-none' : ''}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                Analyze Resume <ChevronRight />
              </>
            )}
          </button>
        </div>

        {/* Results Dashboard */}
        {results && <ResultsDashboard results={results} />}

      </div>
    </div>
  );
}

export default App;
