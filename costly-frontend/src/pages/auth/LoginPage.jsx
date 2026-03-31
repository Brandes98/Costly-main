import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: (res) => {
      setAuth(res.data.token, res.data.usuario);
      navigate('/dashboard');
    },
    onError: (err) => {
      setError(err?.error?.message || 'Credenciales incorrectas');
    },
  });

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center overflow-auto">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-tl opacity-[0.04]" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-gd opacity-[0.04]" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-serif text-4xl font-medium text-ink mb-1">
            Cost<span className="text-tl-m">ly</span>
          </div>
          <div className="text-xs text-mist tracking-widest uppercase">
            Distribuidora de Servicios Vadibarot Ltda.
          </div>
        </div>

        {/* Card */}
        <div className="bg-sur border border-border rounded-card shadow-sh2 p-7">
          <div className="font-serif text-lg font-medium text-ink mb-1">Iniciar sesión</div>
          <div className="text-xs text-mist mb-6">Ingresá tus credenciales para continuar</div>

          <form onSubmit={handleSubmit(mutate)} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@vadibarot.com"
                className="form-input"
                autoComplete="email"
              />
              {errors.email && <span className="text-xs text-rs">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="form-input"
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="text-xs text-rs">{errors.password.message}</span>
              )}
            </div>

            {error && (
              <div className="bg-rs-l text-rs text-xs px-3 py-2 rounded-lg border border-rs/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary w-full justify-center py-2.5 text-sm mt-1"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-mist mt-4">© 2026 Costly · Vadibarot Ltda.</div>
      </div>
    </div>
  );
}
