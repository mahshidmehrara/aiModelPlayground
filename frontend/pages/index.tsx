// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import ReactMarkdown from 'react-markdown';

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

// export default function Home() {
//   const [prompt, setPrompt] = useState('Write a short comparison of AI models in 3 bullet points.');
//   const [session, setSession] = useState<any>(null);
//   const [columns, setColumns] = useState<Record<string, any>>({});
//   const eventSourcesRef = useRef<Record<string, EventSource>>({});

//   const models = [
//     { key: 'gpt-4o', provider: 'openai', label: 'OpenAI — gpt-4o' },
//     { key: 'gpt-4o-mini', provider: 'openai', label: 'OpenAI — gpt-4o-mini' }
//   ];

//   async function createSession() {
//     const res = await axios.post(`${API_BASE}/sessions`, { prompt, models: models.map(m => ({ key: m.key, provider: m.provider })) });
//     setSession(res.data);
//     const initCols: any = {};
//     res.data.models.forEach((m: any) => initCols[m.modelKey] = { text: '', status: 'pending' });
//     setColumns(initCols);

//     await axios.post(`${API_BASE}/sessions/${res.data.id}/start`);

//     res.data.models.forEach((m: any) => openStream(res.data.id, m.modelKey));
//   }

//   function openStream(sessionId: string, modelKey: string) {
//     const url = `${API_BASE}/sessions/${sessionId}/stream/${modelKey}`;
//     const es = new EventSource(url);
//     es.addEventListener('chunk', (e: any) => {
//       const payload = JSON.parse(e.data);
//       setColumns(prev => ({ ...prev, [modelKey]: { ...(prev[modelKey] || {}), text: (prev[modelKey]?.text || '') + payload.text, status: 'streaming' } }));
//     });
//     es.addEventListener('status', (e: any) => {
//       const payload = JSON.parse(e.data);
//       setColumns(prev => ({ ...prev, [modelKey]: { ...(prev[modelKey] || {}), status: payload.status } }));
//     });
//     es.addEventListener('done', (e: any) => {
//       const payload = JSON.parse(e.data);
//       setColumns(prev => ({ ...prev, [modelKey]: { ...(prev[modelKey] || {}), status: 'complete', tokens: payload.tokens, cost: payload.cost } }));
//       es.close();
//     });
//     es.addEventListener('error', (e: any) => {
//       try { const payload = JSON.parse(e.data); setColumns(prev => ({ ...prev, [modelKey]: { ...(prev[modelKey] || {}), status: 'error', error: payload.error } })); } catch { setColumns(prev => ({ ...prev, [modelKey]: { ...(prev[modelKey] || {}), status: 'error' } })); }
//       es.close();
//     });
//     eventSourcesRef.current[modelKey] = es;
//   }

//   return (
//     <div style={{ padding: 24 }}>
//       <h1>AI Model Playground</h1>
//       <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} style={{ width: '100%', marginBottom: 12 }} />
//       <div style={{ display: 'flex', gap: 8 }}>
//         <button onClick={createSession}>Run comparison</button>
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: `repeat(${models.length}, 1fr)`, gap: 12, marginTop: 20 }}>
//         {models.map(m => (
//           <div key={m.key} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
//             <h3>{m.label}</h3>
//             <div style={{ minHeight: 200 }}>
//               <ReactMarkdown>{columns[m.key]?.text ?? ''}</ReactMarkdown>
//             </div>
//             <div style={{ marginTop: 8 }}>
//               <strong>Status:</strong> {columns[m.key]?.status ?? 'pending'}
//               {' • '}
//               <small>Tokens: {columns[m.key]?.tokens ?? '-'}</small>
//               {' • '}
//               <small>Cost: {columns[m.key]?.cost ?? '-'}</small>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from 'react';
import axios from 'axios';

type ModelKey = 'gpt-4o' | 'gpt-4o-mini';

interface ModelResponse {
  key: ModelKey;
  status: 'idle' | 'typing' | 'streaming' | 'done' | 'error';
  content: string;
  tokens: number;
  cost: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<ModelKey, ModelResponse>>({
    'gpt-4o': { key: 'gpt-4o', status: 'idle', content: '', tokens: 0, cost: 0 },
    'gpt-4o-mini': { key: 'gpt-4o-mini', status: 'idle', content: '', tokens: 0, cost: 0 },
  });
  const [isRunning, setIsRunning] = useState(false);

  const selectedModels: ModelKey[] = ['gpt-4o', 'gpt-4o-mini'];

  const handleRunComparison = async () => {
    if (!prompt) return;
    setIsRunning(true);

    try {
      // 1️⃣ Create a session
      const createResp = await axios.post(`/sessions`, {
        prompt,
        models: selectedModels.map((key) => ({ key, provider: 'openai' })),
      });
      const id = createResp.data.id;
      setSessionId(id);

      // 2️⃣ Start the session
      await axios.post(`/sessions/${id}/start`);

      // 3️⃣ Initialize responses
      const newResponses: Record<ModelKey, ModelResponse> = { ...responses };
      selectedModels.forEach((key) => {
        newResponses[key] = { key, status: 'typing', content: '', tokens: 0, cost: 0 };
      });
      setResponses(newResponses);

      // 4️⃣ Open SSE for each model
      selectedModels.forEach((key) => {
        const es = new EventSource(`/sessions/${id}/stream/${key}`);

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            setResponses((prev) => ({
              ...prev,
              [key]: {
                ...prev[key],
                status: data.status ?? prev[key].status,
                content: prev[key].content + (data.chunk ?? ''),
                tokens: data.tokens ?? prev[key].tokens,
                cost: data.cost ?? prev[key].cost,
              },
            }));
          } catch (err) {
            console.error('SSE parse error', err);
          }
        };

        es.onerror = (err) => {
          console.error(`SSE error for ${key}`, err);
          setResponses((prev) => ({
            ...prev,
            [key]: { ...prev[key], status: 'error' },
          }));
          es.close();
        };
      });
    } catch (err) {
      console.error('Error running comparison', err);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>AI Model Playground</h1>

      {/* Prompt input */}
      <textarea
        style={{ width: '100%', height: 100, marginBottom: 16, fontSize: 16 }}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
      />

      <button
        onClick={handleRunComparison}
        disabled={isRunning || !prompt}
        style={{ padding: '8px 16px', fontSize: 16 }}
      >
        Run Comparison
      </button>

      {/* Responses */}
      <div style={{ display: 'flex', marginTop: 24, gap: 16 }}>
        {selectedModels.map((key) => (
          <div key={key} style={{ flex: 1, border: '1px solid #ccc', padding: 16 }}>
            <h3>{key}</h3>
            <div>Status: {responses[key].status}</div>
            <div>Tokens: {responses[key].tokens}</div>
            <div>Cost: ${responses[key].cost.toFixed(4)}</div>
            <pre
              style={{
                marginTop: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f9f9f9',
                padding: 8,
                minHeight: 150,
              }}
            >
              {responses[key].content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
