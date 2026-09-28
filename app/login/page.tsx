import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            LS
          </span>
          <h1 className="mt-3 text-lg font-semibold">Laundry Shop Management</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <ActionForm action={login} submitLabel="Sign in" className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="owner@laundry.ph"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>
        </ActionForm>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Demo: owner@laundry.ph / staff@laundry.ph — password in README
        </p>
      </div>
    </div>
  );
}
