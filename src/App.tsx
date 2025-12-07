import { Route, Routes } from 'react-router';
import { MainLayout } from './layout/main';
import { SimulationLayout } from './layout/simulation';
import { ComparePage } from './pages/simulation/compare';
import { SkillBassinPage } from './pages/simulation/skill-bassin';
import { UmaBassinPage } from './pages/simulation/uma-bassin';

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<SimulationLayout />}>
          <Route index element={<ComparePage />} />
          <Route path="/skill-bassin" element={<SkillBassinPage />} />
          <Route path="/uma-bassin" element={<UmaBassinPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
