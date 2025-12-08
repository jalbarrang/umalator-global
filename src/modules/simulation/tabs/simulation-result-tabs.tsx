import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DistributionTab } from './distribution-tab';
import { RunnerStatsTab } from './runner-stats-tab';
import { SkillsTab } from './skills-tab';
import { StaminaTab } from './stamina-tab';
import {
  BarChartIcon,
  BrainIcon,
  ChartBarIcon,
  HeartPulseIcon,
} from 'lucide-react';

export const SimulationResultTabs = () => {
  return (
    <Tabs defaultValue="stamina">
      <TabsList className="w-full">
        <TabsTrigger value="stamina">
          <span className="hidden md:inline!">Stamina Calc.</span>
          <HeartPulseIcon className="w-4 h-4" />
        </TabsTrigger>
        <TabsTrigger value="distribution">
          <span className="hidden md:inline!">Distribution</span>
          <BarChartIcon className="w-4 h-4" />
        </TabsTrigger>
        <TabsTrigger value="stats">
          <span className="hidden md:inline!">Runner Stats</span>
          <ChartBarIcon className="w-4 h-4" />
        </TabsTrigger>
        <TabsTrigger value="skills">
          <span className="hidden md:inline!">Skills</span>
          <BrainIcon className="w-4 h-4" />
        </TabsTrigger>
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
  );
};
