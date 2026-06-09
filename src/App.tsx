import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Orders } from './pages/Orders'
import { NewOrder } from './pages/NewOrder'
import { EditOrder } from './pages/EditOrder'
import { Technicians } from './pages/Technicians'

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="pedidos/novo" element={<NewOrder />} />
          <Route path="pedidos/:id/editar" element={<EditOrder />} />
          <Route path="prestadores" element={<Technicians />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
