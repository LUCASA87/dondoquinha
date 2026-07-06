import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { InstalarAppBanner } from "@/components/auth/instalar-app-banner";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect?.startsWith("/") ? params.redirect : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-cream via-brand-bg to-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-brand-red/15 bg-white p-8 shadow-xl shadow-brand-red/10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Dondoquinha Moda e Beleza"
            width={80}
            height={80}
            className="rounded-full ring-2 ring-brand-red/40 ring-offset-2 ring-offset-white"
            priority
          />
          <h1 className="mt-4 font-serif text-2xl text-brand-black">Dondoquinha</h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-red">
            MODA E BELEZA
          </p>
          <p className="mt-3 text-sm text-brand-black/60">
            Entre com seu usuário e senha para acessar o sistema.
          </p>
        </div>

        <InstalarAppBanner />
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
