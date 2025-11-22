<script>
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
  <Card class="w-full max-w-md">
    <CardHeader class="space-y-1 text-center">
      <h2 class="text-2xl font-bold text-primary">HealthMonitor</h2>
      <CardTitle class="text-xl">Welcome to HealthMonitor</CardTitle>
      <CardDescription>Login to Your Account</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="username">Username</Label>
        <Input id="username" placeholder="Enter your username" />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="password">Password</Label>
          <a href="/forgot-password" class="text-sm text-primary hover:underline">
            Forgot?
          </a>
        </div>
        <Input id="password" type="password" placeholder="Enter your password" />
      </div>
      <Button class="w-full">Login</Button>
    </CardContent>
    <CardFooter class="justify-center">
      <div class="text-sm text-muted-foreground">
        Don't have an account? 
        <a href="/register" class="text-primary hover:underline">Register</a>
      </div>
    </CardFooter>
  </Card>
</div>
