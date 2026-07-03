import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
      <h1 className="font-serif text-3xl font-bold">Join Your Group</h1>
      <p className="text-sm text-stone-300">
        Sign in with email to access your Terraforming Mars group data.
      </p>
      <LoginForm />
    </main>
  );
}
