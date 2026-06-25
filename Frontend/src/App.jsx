import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './MainPage';
import GeneratedPage from './GeneratedPage';

export default function App() {
  const [projectFiles, setProjectFiles] = useState({});
  const [compiledComponent, setCompiledComponent] = useState(null);
  const [prmpt, setPrmpt] = useState("");

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <MainPage
            setPrmpt={setPrmpt}
            setProjectFiles={setProjectFiles}
            setCompiledComponent={setCompiledComponent}
          />
        } />
        <Route path="/generated" element={
          <GeneratedPage
            prmpt = {prmpt}
            projectFiles={projectFiles}
            Component={compiledComponent}
            setCompiledComponent={setCompiledComponent}
            setProjectFiles={setProjectFiles}
          />
        } />
      </Routes>
    </Router>
  );
}
