import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from './components/layout/AppLayout'

// Lazy load all pages for code-splitting and better initial load performance
const ProductSelector = lazy(() => import('./pages/ProductSelector'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PagesList = lazy(() => import('./pages/PagesList'))
const PageDetail = lazy(() => import('./pages/PageDetail'))
const PropertiesList = lazy(() => import('./pages/PropertiesList'))
const SuggestedValuesList = lazy(() => import('./pages/SuggestedValuesList'))
const EventsList = lazy(() => import('./pages/EventsList'))
const EventDetail = lazy(() => import('./pages/EventDetail'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <Router>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ProductSelector />} />
            <Route path="/products" element={<ProductSelector />} />
            <Route path="/products/:productName" element={<Dashboard />} />
            <Route path="/products/:productName/pages" element={<PagesList />} />
            <Route path="/products/:productName/pages/:pageSlug" element={<PageDetail />} />
            <Route path="/products/:productName/events" element={<EventsList />} />
            <Route path="/products/:productName/events/:eventName" element={<EventDetail />} />
            <Route path="/products/:productName/properties" element={<PropertiesList />} />
            <Route path="/products/:productName/suggested-values" element={<SuggestedValuesList />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </Router>
  )
}

export default App
