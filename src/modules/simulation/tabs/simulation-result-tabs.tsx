import { BarChartIcon, BrainIcon, ChartBarIcon } from 'lucide-react';
import { useState } from 'react';
import { DistributionTab } from './distribution-tab';
import { RunnerStatsTab } from './runner-stats-tab';
import { SkillsTab } from './skills-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const SimulationResultTabs = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'distribution' | 'skills'>('stats');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full h-10!">
        <TabsTrigger
          value="stats"
          className={cn('cursor-pointer', {
            'bg-primary! text-primary-foreground!': activeTab === 'stats',
          })}
        >
          <span className="hidden md:inline!">Runner Stats</span>
          <ChartBarIcon className="w-4 h-4" />
        </TabsTrigger>

        <TabsTrigger
          value="distribution"
          className={cn('cursor-pointer', {
            'bg-primary! text-primary-foreground!': activeTab === 'distribution',
          })}
        >
          <span className="hidden md:inline!">Distribution</span>
          <BarChartIcon className="w-4 h-4" />
        </TabsTrigger>

        <TabsTrigger
          value="skills"
          className={cn('cursor-pointer', {
            'bg-primary! text-primary-foreground!': activeTab === 'skills',
          })}
        >
          <span className="hidden md:inline!">Skills</span>
          <BrainIcon className="w-4 h-4" />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="distribution" className="mt-0">
        <DistributionTab />
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
