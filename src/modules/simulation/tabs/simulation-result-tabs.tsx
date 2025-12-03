import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRaceStore } from '@/store/race/store';
import { DistributionTab } from './distribution-tab';
import { RunnerStatsTab } from './runner-stats-tab';
import { SkillsTab } from './skills-tab';
import { StaminaTab } from './stamina-tab';

export const SimulationResultTabs = () => {
  const { chartData, results } = useRaceStore();

  if (!chartData || results.length === 0) return null;

  return (
    <div className="mt-4">
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="w-full">
          {/* <TabsTrigger value="summary">Summary</TabsTrigger> */}
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="stats">Runner Stats</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="stamina">Stamina</TabsTrigger>
        </TabsList>

        {/* <TabsContent value="summary" className="mt-0">
          <SummaryTab />
        </TabsContent> */}

        <TabsContent value="distribution" className="mt-0">
          <DistributionTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <RunnerStatsTab />
        </TabsContent>

        <TabsContent value="skills" className="mt-0">
          <SkillsTab />
        </TabsContent>

        <TabsContent value="stamina" className="mt-0">
          <StaminaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
