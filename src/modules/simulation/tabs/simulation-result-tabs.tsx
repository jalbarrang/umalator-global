import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DistributionTab } from './distribution-tab';
import { RunnerStatsTab } from './runner-stats-tab';
import { SkillsTab } from './skills-tab';
import { StaminaTab } from './stamina-tab';

export const SimulationResultTabs = () => {
  return (
    <div className="mt-4">
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="stamina">Stamina Calc.</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="stats">Runner Stats</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="mt-0">
          <DistributionTab />
        </TabsContent>

        <TabsContent value="stamina" className="mt-0">
          <StaminaTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <RunnerStatsTab />
        </TabsContent>

        <TabsContent value="skills" className="mt-0">
          <SkillsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
