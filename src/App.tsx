import { Route, Routes } from 'react-router';
import { MainLayout } from './layout/main';
import { SimulationLayout } from './layout/simulation';
import { ComparePage } from './pages/simulation/compare';
import { SkillBassinPage } from './pages/simulation/skill-basin';
import { UmaBassinPage } from './pages/simulation/uma-basin';
import { lazy } from 'react';

const RunnersPage = lazy(() => import('./pages/runners'));
const EditRunnerPage = lazy(() => import('./pages/runners/[id]/edit'));
const NewRunnerPage = lazy(() => import('./pages/runners/new'));

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<SimulationLayout />}>
          <Route index element={<ComparePage />} />
          <Route path="/skill-bassin" element={<SkillBassinPage />} />
          <Route path="/uma-bassin" element={<UmaBassinPage />} />
        </Route>

        <Route path="/runners" element={<RunnersPage />} />
        <Route path="/runners/new" element={<NewRunnerPage />} />
        <Route path="/runners/:id/edit" element={<EditRunnerPage />} />
      </Route>
    </Routes>
  );
}
