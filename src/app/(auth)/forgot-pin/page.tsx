import { ForgotPinForm } from '@/features/auth/forgot-pin-form';

export default function ForgotPinPage() {
  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Account Recovery</p>
        <h1 className="tm-display-title text-3xl font-bold">Reset Your PIN</h1>
        <p className="tm-body-copy text-sm">
          Enter the email address on your account. We will send a secure link to create a new 6-digit PIN.
        </p>
        <ForgotPinForm />
      </section>
    </main>
  );
}
