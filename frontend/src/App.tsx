import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProductsList } from './pages/ProductsList'
import { ProductDetail } from './pages/ProductDetail'
import { PageDetail } from './pages/PageDetail'
import { VariablesList } from './pages/VariablesList'
import { SuggestedValuesList } from './pages/SuggestedValuesList'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsList />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/products/:productSlug/variables" element={<VariablesList />} />
          <Route path="/products/:productSlug/suggested-values" element={<SuggestedValuesList />} />
          <Route path="/products/:productSlug/pages/:pageSlug" element={<PageDetail />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App