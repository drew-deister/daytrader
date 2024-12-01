'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('userInput');

    setIsLoading(true);
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      setResponse('Error: Failed to fetch response');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-r from-blue-500 to-purple-500 relative">
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-transform transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-lg font-bold text-black">Daniel Li Sucks</p>
        </div>
      </div>
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className="absolute top-4 left-4 z-10 p-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition duration-200 ease-in-out"
      >
        ☰
      </button>

      <h1 className="text-5xl font-extrabold text-white mb-8 drop-shadow-lg">Music Oracle</h1>
      
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            name="userInput"
            placeholder="Enter your question..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 ease-in-out text-black"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Ask
          </button>
        </form>
        
        {isLoading && (
          <div className="flex flex-col items-center my-8">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-200">Loading...</p>
          </div>
        )}
        
        {response && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-md">
            <ReactMarkdown 
              className="prose prose-blue max-w-none"
              components={{
                p: ({node, ...props}) => <p className="mb-4 text-gray-800" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 text-gray-800" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 text-gray-800" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2 text-gray-800" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4 text-gray-800" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4 text-gray-800" {...props} />,
                li: ({node, ...props}) => <li className="mb-1 text-gray-800" {...props} />,
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 rounded text-gray-800" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto text-gray-800" {...props} />
              }}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </main>
  );
}
