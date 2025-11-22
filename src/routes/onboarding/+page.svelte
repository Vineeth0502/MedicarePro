<script>
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Plus, Activity, Heart } from "lucide-svelte";

  let metrics = $state([
    { id: 1, name: "Blood Pressure", icon: Activity, selected: true },
    { id: 2, name: "Heart Rate", icon: Heart, selected: true }
  ]);

  function toggleMetric(id) {
    const index = metrics.findIndex(m => m.id === id);
    if (index !== -1) {
      metrics[index].selected = !metrics[index].selected;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
  <!-- Decorative background elements to mimic the "medical diagrams" look -->
  <div class="absolute inset-0 opacity-5 pointer-events-none">
    <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M0 50 Q 25 25 50 50 T 100 50" stroke="currentColor" fill="none" stroke-width="0.5" />
      <path d="M0 30 Q 25 80 50 30 T 100 30" stroke="currentColor" fill="none" stroke-width="0.5" />
      <circle cx="80" cy="20" r="10" stroke="currentColor" fill="none" stroke-width="0.5" />
      <rect x="10" y="70" width="20" height="20" stroke="currentColor" fill="none" stroke-width="0.5" />
    </svg>
  </div>

  <Card class="w-full max-w-lg z-10 shadow-lg border-t-4 border-t-primary">
    <CardHeader>
      <div class="mb-2 text-sm font-semibold text-primary uppercase tracking-wider">HealthMonitorPro</div>
      <CardTitle class="text-2xl">Set up your health</CardTitle>
      <CardDescription>Name your dashboard and add metrics</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-2">
        <Label for="dashboard-name">Dashboard name</Label>
        <Input id="dashboard-name" placeholder="e.g. My Health Journey" />
      </div>

      <div class="space-y-3">
        <Label>Add as many metrics as needed</Label>
        <div class="grid gap-3">
          {#each metrics as metric}
            <button
              class="flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-accent {metric.selected ? 'border-primary bg-primary/5' : 'border-input'}"
              onclick={() => toggleMetric(metric.id)}
            >
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-full bg-background border">
                  <metric.icon class="h-4 w-4 text-primary" />
                </div>
                <span class="font-medium">{metric.name}</span>
              </div>
              {#if metric.selected}
                <div class="h-2 w-2 rounded-full bg-primary"></div>
              {/if}
            </button>
          {/each}
          
          <button class="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Plus class="h-4 w-4" />
            <span>Add metric</span>
          </button>
        </div>
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full" size="lg">Next</Button>
    </CardFooter>
  </Card>
</div>
