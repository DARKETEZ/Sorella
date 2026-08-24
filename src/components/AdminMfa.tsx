import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'

type Mode =
  | 'loading'
  | 'setup'
  | 'enroll'
  | 'verify'
  | 'error'

export default function AdminMfa() {
  const {
    isModerator,
    refreshSecurity,
    signOut,
  } = useAuth()

  const [mode, setMode] =
    useState<Mode>('loading')

  const [factorId, setFactorId] =
    useState('')

  const [qrCode, setQrCode] =
    useState('')

  const [secret, setSecret] =
    useState('')

  const [code, setCode] =
    useState('')

  const [error, setError] =
    useState('')

  const [submitting, setSubmitting] =
    useState(false)

  const [enrolling, setEnrolling] =
    useState(false)

  useEffect(() => {
    let active = true

    async function checkMfa() {
      setMode('loading')
      setError('')

      if (!supabase) {
        if (!active) return

        setError(
          'Supabase no está configurado correctamente.'
        )

        setMode('error')
        return
      }

      try {
        const factors =
          await supabase.auth.mfa.listFactors()

        if (!active) return

        if (factors.error) {
          throw factors.error
        }

        const totpFactors =
          factors.data?.totp ?? []

        const verified =
          totpFactors.find(
            factor =>
              factor.status === 'verified'
          )

        // Ya tiene 2FA configurado.
        if (verified) {
          setFactorId(verified.id)
          setMode('verify')
          return
        }

        // No creamos el factor aquí.
        // Esperamos a que el usuario pulse el botón.
        setMode('setup')
      } catch (err) {
        if (!active) return

        console.error(
          'Error comprobando MFA:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo comprobar la configuración 2FA.'
        )

        setMode('error')
      }
    }

    void checkMfa()

    return () => {
      active = false
    }
  }, [])

  if (isModerator) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    )
  }

  async function startEnrollment() {
    if (!supabase) return

    if (enrolling) return

    setEnrolling(true)
    setError('')

    try {
      const enrollment =
        await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Sorella Admin',
        })

      if (enrollment.error) {
        throw enrollment.error
      }

      setFactorId(
        enrollment.data.id
      )

      setQrCode(
        enrollment.data.totp.qr_code
      )

      setSecret(
        enrollment.data.totp.secret
      )

      setMode('enroll')
    } catch (err) {
      console.error(
        'Error creando 2FA:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la configuración 2FA.'
      )

      setMode('error')
    } finally {
      setEnrolling(false)
    }
  }

  async function verify(
    event: FormEvent
  ) {
    event.preventDefault()

    if (!supabase) {
      setError(
        'Supabase no está configurado.'
      )
      return
    }

    if (!factorId) {
      setError(
        'No se encontró el factor 2FA.'
      )
      return
    }

    const cleanCode = code
      .replace(/\D/g, '')
      .slice(0, 6)

    if (cleanCode.length !== 6) {
      setError(
        'Escribe el código de 6 dígitos.'
      )
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const challenge =
        await supabase.auth.mfa.challenge({
          factorId,
        })

      if (challenge.error) {
        throw challenge.error
      }

      const verification =
        await supabase.auth.mfa.verify({
          factorId,
          challengeId:
            challenge.data.id,
          code: cleanCode,
        })

      if (verification.error) {
        throw verification.error
      }

      await refreshSecurity()
      setCode('')
    } catch (err) {
      console.error(
        'Error verificando MFA:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Código incorrecto. Intenta nuevamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-sorella-mist px-5 py-12 sm:py-16">
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="mx-auto max-w-lg"
      >
        <div className="rounded-[34px] bg-white p-7 shadow-soft sm:p-9">
          <img
            src="/sorella-logo.png"
            alt="Sorella Eyewear"
            className="h-12 w-auto max-w-[230px] object-contain"
          />

          <div className="mt-8 text-xs font-black uppercase tracking-[.24em] text-sorella-red">
            Seguridad 2FA
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-sorella-ink">
            Verificación de administrador
          </h1>

          {/* LOADING */}

          {mode === 'loading' && (
            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sorella-red" />

                <div>
                  <div className="text-sm font-black text-slate-700">
                    Comprobando seguridad
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-400">
                    Revisando tu configuración 2FA…
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONFIGURAR POR PRIMERA VEZ */}

          {mode === 'setup' && (
            <div className="mt-7">
              <div className="rounded-[26px] bg-slate-50 p-6">
                <div className="text-lg font-black text-slate-800">
                  Protege tu cuenta
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Tu cuenta de administrador todavía no tiene
                  autenticación en dos pasos configurada.
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Usaremos una aplicación como Google Authenticator,
                  Microsoft Authenticator, Authy o 1Password.
                </p>
              </div>

              <button
                type="button"
                disabled={enrolling}
                onClick={() =>
                  void startEnrollment()
                }
                className="mt-5 w-full rounded-2xl bg-sorella-red px-5 py-3.5 font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enrolling
                  ? 'Preparando QR…'
                  : 'Configurar 2FA'}
              </button>
            </div>
          )}

          {/* QR */}

          {mode === 'enroll' && (
            <div className="mt-6">
              <p className="leading-7 text-slate-600">
                Escanea este código QR con tu aplicación
                autenticadora.
              </p>

              {qrCode && (
                <div className="mt-5 flex justify-center rounded-[28px] border border-slate-200 bg-white p-5">
                  <img
                    src={qrCode}
                    alt="Código QR para activar 2FA"
                    className="h-52 w-52"
                  />
                </div>
              )}

              {secret && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[.18em] text-sorella-blue">
                    Clave manual
                  </div>

                  <code className="mt-2 block break-all text-sm font-bold text-slate-700">
                    {secret}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* 2FA YA CONFIGURADO */}

          {mode === 'verify' && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="font-black text-slate-700">
                2FA activo
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Abre tu aplicación autenticadora y escribe el
                código temporal para continuar.
              </p>
            </div>
          )}

          {/* FORMULARIO DEL CÓDIGO */}

          {(mode === 'enroll' ||
            mode === 'verify') && (
            <form
              onSubmit={verify}
              className="mt-6"
            >
              <label className="block text-sm font-black text-slate-700">
                Código de 6 dígitos
              </label>

              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={event =>
                  setCode(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="123456"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-4 text-center text-2xl font-black tracking-[.35em] outline-none transition focus:border-sorella-blue"
              />

              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  code.length !== 6
                }
                className="mt-5 w-full rounded-2xl bg-sorella-red px-5 py-3.5 font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Verificando…'
                  : mode === 'enroll'
                    ? 'Activar 2FA y entrar'
                    : 'Verificar y entrar'}
              </button>
            </form>
          )}

          {/* ERROR */}

          {mode === 'error' && (
            <div className="mt-7">
              <div className="rounded-2xl bg-red-50 p-5">
                <div className="font-black text-red-700">
                  No se pudo preparar 2FA
                </div>

                <p className="mt-2 break-words text-sm leading-6 text-red-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="mt-4 w-full rounded-2xl border border-slate-200 px-5 py-3.5 font-black text-slate-700"
              >
                Intentar nuevamente
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void signOut()
            }
            className="mt-5 w-full text-sm font-bold text-slate-500 transition hover:text-sorella-red"
          >
            Cerrar sesión
          </button>
        </div>
      </motion.div>
    </main>
  )
}