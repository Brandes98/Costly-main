import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PedidosPage from './pages/pedidos/PedidosPage';
import PedidoDetalle from './pages/pedidos/PedidoDetalle';
import NuevoPedido from './pages/pedidos/NuevoPedido';
import ProveedoresPage from './pages/proveedores/ProveedoresPage';
import PagosPage from './pages/pagos/PagosPage';
import ProductosPage from './pages/productos/ProductosPage';
import {
  ImportacionesPage,
  CosteosPage,
  SeguimientoPage,
  AduanaPage,
  ClientesPage,
  ReportesPage,
  UsuariosPage,
  AuditoriaPage,
  EmpresaPage,
} from './pages/placeholders';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="pedidos/nuevo" element={<NuevoPedido />} />
          <Route path="pedidos/:id" element={<PedidoDetalle />} />
          <Route path="importaciones" element={<ImportacionesPage />} />
          <Route path="costeos" element={<CosteosPage />} />
          <Route path="pagos" element={<PagosPage />} />
          <Route path="seguimiento" element={<SeguimientoPage />} />
          <Route path="aduana" element={<AduanaPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="auditoria" element={<AuditoriaPage />} />
          <Route path="empresa" element={<EmpresaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
