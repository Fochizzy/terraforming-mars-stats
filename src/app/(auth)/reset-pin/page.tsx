import { ResetPinForm } from '@/features/auth/reset-pin-form';

export default function ResetPinPage() {
  return (
    <main
      className="tm-app-shell"
      style={{
        backgroundColor: '#080b10',
        backgroundImage:
          "linear-gradient(90deg, rgba(5, 7, 10, 0.82) 0%, rgba(7, 9, 12, 0.65) 46%, rgba(7, 9, 12, 0.38) 100%), linear-gradient(180deg, rgba(5, 7, 10, 0.18) 0%, rgba(5, 7, 10, 0.72) 100%), url('/auth-mars-background.svg')",
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Secure Access</p>
        <h1 className="tm-display-title text-3xl font-bold">Create a New PIN</h1>
        <p className="tm-body-copy text-sm">
          Choose a new 6-digit PIN for your Terraforming Mars Stats account.
        </p>
        <ResetPinForm />
      </section>
    </main>
  );
}
