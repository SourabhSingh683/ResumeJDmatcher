import React from 'react';
import { CheckCircle, XCircle, Zap, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';

const ResultsDashboard = ({ results }) => {
  const { matchScore, matchingSkills, missingSkills, strengths, weaknesses, suggestions } = results;

  // Determine score color and status
  let scoreColor = 'text-red-500';
  let barColor = 'bg-red-500';
  let statusText = 'Fail';
  
  if (matchScore >= 75) {
    scoreColor = 'text-emerald-500';
    barColor = 'bg-emerald-500';
    statusText = 'Pass';
  } else if (matchScore >= 50) {
    scoreColor = 'text-amber-500';
    barColor = 'bg-amber-500';
    statusText = 'Review Needed';
  }

  return (
    <div className="bg-dark-panel p-8 rounded-2xl shadow-xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Header & Score */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 pb-8 border-b border-slate-700">
        <div>
          <h2 className="text-3xl font-bold mb-2">Analysis Results</h2>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold bg-opacity-10 uppercase tracking-wider ${
              statusText === 'Pass' ? 'bg-emerald-500 text-emerald-400' :
              statusText === 'Fail' ? 'bg-red-500 text-red-400' : 'bg-amber-500 text-amber-400'
            }`}>
              ATS Status: {statusText}
            </span>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex flex-col items-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={scoreColor}
                strokeDasharray={`${matchScore}, 100`}
                strokeWidth="3"
                strokeDashoffset="0"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>{matchScore}</span>
              <span className="text-slate-500 text-xs">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Comparison */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <CheckCircle />
            <h3 className="text-lg font-semibold">Matching Skills</h3>
          </div>
          {matchingSkills && matchingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {matchingSkills.map((skill, idx) => (
                <span key={idx} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm">No significant matching skills found.</p>
          )}
        </div>

        <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4 text-red-400">
            <XCircle />
            <h3 className="text-lg font-semibold">Missing Skills</h3>
          </div>
          {missingSkills && missingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((skill, idx) => (
                <span key={idx} className="bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm">No missing skills detected. Great job!</p>
          )}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Zap size={20} />
            <h3 className="text-lg font-semibold text-slate-200">Strengths</h3>
          </div>
          <ul className="space-y-3">
            {strengths?.map((str, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-slate-800/20 p-3 rounded-lg border border-slate-700/30">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-slate-300 text-sm leading-relaxed">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 text-amber-400">
            <ShieldAlert size={20} />
            <h3 className="text-lg font-semibold text-slate-200">Weaknesses</h3>
          </div>
          <ul className="space-y-3">
            {weaknesses?.map((weak, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-slate-800/20 p-3 rounded-lg border border-slate-700/30">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-slate-300 text-sm leading-relaxed">{weak}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-gradient-to-r from-blue-900/20 to-emerald-900/20 p-6 rounded-xl border border-blue-500/20">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-blue-400" />
          <h3 className="text-lg font-semibold">How to Improve</h3>
        </div>
        <ul className="space-y-2">
          {suggestions?.map((sug, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300 text-sm">{sug}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default ResultsDashboard;
