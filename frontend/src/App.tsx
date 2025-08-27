import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProductsList } from './pages/ProductsList'
import { ProductDetail } from './pages/ProductDetail'
import { PageDetail } from './pages/PageDetail'
import { VariablesList } from './pages/VariablesList'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsList />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products/:productId/variables" element={<VariablesList />} />
          <Route path="/pages/:id" element={<PageDetail />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App