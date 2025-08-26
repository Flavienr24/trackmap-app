import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={
            <div className="text-center py-12 bg-red-500">
              <h1 className="text-4xl font-bold text-white mb-4">
                TrackMap Application - TEST TAILWIND
              </h1>
              <p className="text-lg text-yellow-300 mb-8">
                Si tu vois du rouge et du jaune, Tailwind fonctionne !
              </p>
              <div className="bg-green-500 border-4 border-blue-500 rounded-xl p-6 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-white mb-2">
                  🧪 Test Tailwind CSS
                </h2>
                <p className="text-gray-200">
                  Fond vert avec bordure bleue = Tailwind OK
                </p>
              </div>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App