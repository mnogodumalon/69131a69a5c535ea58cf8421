import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import LieferantenPage from '@/pages/LieferantenPage';
import BestellungenPage from '@/pages/BestellungenPage';
import ProduktePage from '@/pages/ProduktePage';
import LagerbestandPage from '@/pages/LagerbestandPage';
import WareneingangPage from '@/pages/WareneingangPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="lieferanten" element={<LieferantenPage />} />
          <Route path="bestellungen" element={<BestellungenPage />} />
          <Route path="produkte" element={<ProduktePage />} />
          <Route path="lagerbestand" element={<LagerbestandPage />} />
          <Route path="wareneingang" element={<WareneingangPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}