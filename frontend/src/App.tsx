import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProductsList } from './pages/ProductsList'
import { ProductDetail } from './pages/ProductDetail'
import { PageDetail } from './pages/PageDetail'
import { PropertiesList } from './pages/PropertiesList'
import { SuggestedValuesList } from './pages/SuggestedValuesList'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsList />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/products/:productSlug/properties" element={<PropertiesList />} />
          <Route path="/products/:productSlug/suggested-values" element={<SuggestedValuesList />} />
          <Route path="/products/:productSlug/pages/:pageSlug" element={<PageDetail />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App