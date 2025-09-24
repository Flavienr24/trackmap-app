import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProductSelector } from './pages/ProductSelector'
import { Dashboard } from './pages/Dashboard'
import { PagesList } from './pages/PagesList'
import { PageDetail } from './pages/PageDetail'
import { PropertiesList } from './pages/PropertiesList'
import { SuggestedValuesList } from './pages/SuggestedValuesList'
import { EventsList } from './pages/EventsList'

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ProductSelector />} />
          <Route path="/products/:productName" element={<Dashboard />} />
          <Route path="/products/:productName/pages" element={<PagesList />} />
          <Route path="/products/:productName/pages/:pageSlug" element={<PageDetail />} />
          <Route path="/products/:productName/events" element={<EventsList />} />
          <Route path="/products/:productName/properties" element={<PropertiesList />} />
          <Route path="/products/:productName/suggested-values" element={<SuggestedValuesList />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}

export default App