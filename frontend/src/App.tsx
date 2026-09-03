import { TradingDashboard } from './components/TradingDashboard'

function App() {
  return (
    <div className="min-h-screen bg-[#08060d] p-4 md:p-8 font-sans selection:bg-purple-500/30">
      <header className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-indigo-500 inline-block drop-shadow-lg mb-2">
          Antigravity Trading Bot
        </h1>
        <p className="text-gray-400 text-lg">Algorithmic trading and real-time market analysis</p>
      </header>
      
      <main className="max-w-7xl mx-auto">
        <TradingDashboard />
      </main>
    </div>
  )
}

export default App
