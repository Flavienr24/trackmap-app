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
          <Route path="/products/:productName" element={<ProductDetail />} />
          <Route path="/products/:productName/properties" element={<PropertiesList />} />
          <Route path="/products/:productName/suggested-values" element={<SuggestedValuesList />} />
          <Route path="/products/:productName/pages/:pageSlug" element={<PageDetail />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App