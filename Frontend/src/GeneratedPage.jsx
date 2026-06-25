import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as esbuild from 'esbuild-wasm';
import createVirtualFsPlugin from './scripts/virtualfs';

export default function GeneratedPage({ prmpt, projectFiles, Component, setCompiledComponent, setProjectFiles }) {
  const navigate = useNavigate();
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);

  // Persistent logging that won't get cleared by regeneration of page
  const log = (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);
    // Also store in localStorage for persistence
    const logs = JSON.parse(localStorage.getItem('refinement_logs') || '[]');
    logs.push(logEntry);
    localStorage.setItem('refinement_logs', JSON.stringify(logs.slice(-50))); // Keep last 50 logs
  };

  log("GeneratedPage mounted/rendered");

  const handleRefinePrompt = async () => {
    log("handleRefinePrompt called", { refinePrompt, isRefining });
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    setRefineError(null);
    try {
      log("Sending refinement request", { refinePrompt });
      log("Current files", { projectFiles });
      
      const res = await fetch("http://localhost:3001/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prmpt,
          refine_prompt: refinePrompt,
          files_dict: projectFiles
        })
      });
      const data = await res.json();
      log("Refinement response received", { data });

      if (!data || data.error) {
        throw new Error(data?.error || "No updated files returned.");
      }
      
      // Check if files actually changed
      const filesChanged = JSON.stringify(data) !== JSON.stringify(projectFiles);
      log("Files changed check", { filesChanged });
      
      // More detailed comparison
      if (!filesChanged) {
        log("No changes detected in files");
 
        // Check individual files
        Object.keys(data).forEach(filename => {
          if (data[filename] !== projectFiles[filename]) {
            log(`File ${filename} changed`, { 
              original: projectFiles[filename], 
              new: data[filename] 
            });
          }
        });
        
        setRefineError("No changes were made to the code");
        return;
      }
      
      const entry = "App.js";
      const files = data;
      setProjectFiles(files);
      
      log("Recompiling with new files");
      // Recompile with new files
      const result = await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'GeneratedComponent',
        platform: 'browser',
        plugins: [createVirtualFsPlugin(files)],
        external: ['react', 'react-dom']
      });
      
      log("Compilation successful, updating component");
      let outputCode = result.outputFiles[0].text;
      outputCode = outputCode
        .replace(/__require\(["']react["']\)/g, 'window.React')
        .replace(/__require\(["']react-dom["']\)/g, 'window.ReactDOM');
      outputCode += '\nwindow.GeneratedComponent = GeneratedComponent;';
      
      log("Evaluating new code");
      eval(outputCode);
      const NewComponent = window.GeneratedComponent?.default || window.GeneratedComponent;
      
      if (!NewComponent) {
        throw new Error("Failed to create new component");
      }
      
      log("Setting new component");
      setCompiledComponent(() => NewComponent);
      setRefinePrompt("");
      log("Refinement completed successfully");
    } catch (e) {
      log("Refinement error", { error: e.message, stack: e.stack });
      setRefineError(e.message);
    } finally {
      setIsRefining(false);
    }
  };
  return (
    <div className="min-h-screen w-screen relative">
      {/* Render the generated component full screen */}
      <div className="absolute inset-0 w-full h-full overflow-auto">
        {Component && <Component />}
      </div>
      {/* Floating, blurred, rounded bottom overlay for refinement prompt */}
      <div className="fixed left-1/2 -translate-x-[50%] bottom-20 z-50 max-w-6xl w-[150vw] flex items-center justify-center gap-3">
        {/* Smallest left box */}
        <div className="h-5 w-5 border-2 border-white rounded-2xl bg-black/80 backdrop-blur-lg shadow-2xl flex items-center justify-center" />
        {/* Small left box */}
        <div className="h-10 w-10 border-2 border-white rounded-2xl bg-black/80 backdrop-blur-lg shadow-2xl flex items-center justify-center" />
        {/* Main refine box */}
        <div className="flex-1 min-w-[250px] max-w-4xl border-2 border-white rounded-2xl bg-black/80 backdrop-blur-lg shadow-2xl flex items-center px-6 py-4 gap-4">
          {/* W E B I N I branding with beta */}
          <button
            onClick={() => {
              setCompiledComponent(null);
              navigate("/");
            }}
            className="flex items-end text-teal-400 hover:text-teal-300 focus:outline-none mr-4 group"
            title="Home"
          >
            <span className="text-2xl font-bold tracking-widest group-hover:text-teal-200 transition">W E B I N I</span>
            {/* <span className="ml-2 text-xs align-bottom text-blue-300 group-hover:text-blue-100 transition">beta</span> */}
          </button>
          {/* Refinement prompt input */}
          <input
            type="text"
            value={refinePrompt}
            onChange={e => setRefinePrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !isRefining) handleRefinePrompt();
            }}
            className="flex-1 bg-black/80 border border-teal-500 rounded px-4 py-2 text-teal-200 placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
            placeholder="Refine this page (e.g., Add a dark mode toggle)"
            disabled={isRefining}
          />
          {refineError && <p className="text-red-400 ml-4">{refineError}</p>}
        </div>
        {/* Small right box */}
        <div className="h-10 w-10 border-2 border-white rounded-2xl bg-black/80 backdrop-blur-lg shadow-2xl flex items-center justify-center" />
        {/* Smallest right box */}
        <div className="h-5 w-5 border-2 border-white rounded-2xl bg-black/80 backdrop-blur-lg shadow-2xl flex items-center justify-center" />
      </div>
    </div>
  );
}
