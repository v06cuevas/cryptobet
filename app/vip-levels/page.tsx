"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Crown, Info, Wallet, TrendingUp, Shield, Gift, Clock, Zap } from "lucide-react"
import { getVIPLevels, getUserVIPStatus, type VIPLevel, type UserVIPStatus } from "@/app/actions/vip-levels"
import { getUserProfile } from "@/app/actions/profiles"

export default function VIPLevelsPage() {
  const router = useRouter()
  const [vipLevels, setVipLevels] = useState<VIPLevel[]>([])
  const [userVIPStatus, setUserVIPStatus] = useState<UserVIPStatus | null>(null)
  const [userBalance, setUserBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const vipLevelsResult = await getVIPLevels()
      if (vipLevelsResult.success && vipLevelsResult.data) {
        setVipLevels(vipLevelsResult.data)
      }

      const vipStatusResult = await getUserVIPStatus()
      if (vipStatusResult.success && vipStatusResult.data) {
        setUserVIPStatus(vipStatusResult.data)
      }

      const profileResult = await getUserProfile()
      if (profileResult.success && profileResult.data) {
        setUserBalance(profileResult.data.balance)
      }
    } catch (error) {
      console.error("Error loading VIP data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando niveles VIP...</p>
          </div>
        </div>
      </div>
    )
  }

  const currentVipLevel = vipLevels.find((level) => level.level === (userVIPStatus?.currentLevel || 0))
  const nextLevel = userVIPStatus?.nextLevel

  if (!currentVipLevel) {
    return (
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="text-center">
          <p className="text-muted-foreground">Error al cargar datos VIP</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Niveles VIP</h1>
        <div className="bg-primary/10 p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">Saldo disponible</div>
          <div className="text-2xl font-bold text-primary">
            ${userBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2 p-0">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      {/* VIP Status Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${currentVipLevel.color === "bg-black" ? "text-yellow-500" : ""}`} />
            <span>Tu Nivel VIP</span>
          </CardTitle>
          <CardDescription>Beneficios exclusivos basados en tu actividad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`${currentVipLevel.color} text-white h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold`}
              >
                {currentVipLevel.level}
              </div>
              <div>
                <h3 className="font-bold text-lg">{currentVipLevel.name}</h3>
                <p className="text-sm text-muted-foreground">Nivel actual</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">Límite mensual de retiro</p>
              <p className="font-bold">${currentVipLevel.monthlyLimit.toLocaleString()}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">Total depositado</p>
              <p className="font-bold">
                ${(userVIPStatus?.totalDeposits || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Tus beneficios actuales:</h4>
            <ul className="space-y-1">
              {currentVipLevel.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {nextLevel && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-1">Próximo nivel: {nextLevel.name}</p>
              <p className="text-xs text-blue-700">
                Necesitas depositar $
                {(nextLevel.depositRequired - (userVIPStatus?.totalDeposits || 0)).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                })}{" "}
                más
              </p>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${userVIPStatus?.progressToNext || 0}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-3">
            <Link href="/deposit" className="w-full">
              <Button className="w-full">Aumentar tu nivel VIP</Button>
            </Link>
            <Link href="/withdraw" className="w-full">
              <Button variant="outline" className="w-full bg-transparent">
                Realizar un retiro
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* VIP Levels Tabs */}
      <Tabs defaultValue="levels" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="levels">Niveles VIP</TabsTrigger>
          <TabsTrigger value="benefits">Beneficios</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Requisitos de Niveles VIP</CardTitle>
              <CardDescription>Depósitos necesarios para alcanzar cada nivel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Nivel</th>
                      <th className="text-left py-2">Nombre</th>
                      <th className="text-right py-2">Depósito Requerido</th>
                      <th className="text-right py-2">Límite Mensual</th>
                      <th className="text-right py-2">Retiros/Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vipLevels.map((level) => (
                      <tr
                        key={level.level}
                        className={`border-b ${level.level === userVIPStatus?.currentLevel ? "bg-muted" : ""}`}
                      >
                        <td className="py-2 flex items-center gap-1">
                          <span
                            className={`inline-block w-5 h-5 rounded-full ${level.color} text-white text-xs flex items-center justify-center`}
                          >
                            {level.level}
                          </span>
                        </td>
                        <td className="py-2">{level.name}</td>
                        <td className="py-2 text-right">${level.depositRequired?.toLocaleString() || "0"}</td>
                        <td className="py-2 text-right">${level.monthlyLimit?.toLocaleString() || "0"}</td>
                        <td className="py-2 text-right">{level.retirosCantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 p-4 rounded-md mt-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Información importante:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        El nivel VIP se calcula en base al total de depósitos aprobados realizados en tu cuenta. A mayor
                        nivel, mayores beneficios y límites de retiro.
                      </li>
                      <li>
                        Los intereses diarios se calculan sobre tu saldo disponible y se acreditan automáticamente cada
                        24 horas.
                      </li>
                      <li>
                        El porcentaje de interés aumenta con cada nivel VIP, desde 1.70% para el nivel básico hasta
                        3.40% para el nivel VIP Black.
                      </li>
                      <li>
                        Las comisiones de retiro disminuyen con cada nivel VIP, desde 9.6% para los niveles básicos
                        hasta 4% para el nivel VIP Black.
                      </li>
                      <li>
                        El límite de retiro mensual es el 75% del depósito mínimo requerido para cada nivel VIP, excepto
                        para el nivel VIP 0 que tiene un límite de $15.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Beneficios por Nivel VIP</CardTitle>
              <CardDescription>Ventajas exclusivas para cada nivel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {vipLevels.map((level) => (
                  <div
                    key={level.level}
                    className={`p-4 rounded-md border ${level.level === userVIPStatus?.currentLevel ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`${level.color} text-white h-10 w-10 rounded-full flex items-center justify-center font-bold`}
                      >
                        {level.level}
                      </div>
                      <div>
                        <h3 className="font-bold">{level.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Depósito mínimo: ${level.depositRequired?.toLocaleString() || "0"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {level.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <BenefitIcon index={index} />
                          <span className="text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {level.level === userVIPStatus?.currentLevel && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-primary">Tu nivel actual</p>
                      </div>
                    )}

                    {level.level > (userVIPStatus?.currentLevel || 0) && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          Necesitas depositar $
                          {(level.depositRequired - (userVIPStatus?.totalDeposits || 0)).toLocaleString()} más para
                          alcanzar este nivel
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <span>Preguntas Frecuentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">¿Cómo se calcula mi nivel VIP?</h3>
            <p className="text-sm text-muted-foreground">
              Tu nivel VIP se calcula en base al total de depósitos aprobados realizados en tu cuenta. Cuanto más
              deposites, mayor será tu nivel VIP.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Puedo perder mi nivel VIP?</h3>
            <p className="text-sm text-muted-foreground">
              No, una vez alcanzado un nivel VIP, este se mantiene permanentemente. Tu nivel nunca disminuirá, incluso
              si realizas retiros. El nivel VIP se calcula en base al total histórico de depósitos aprobados realizados,
              no en tu saldo actual.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cómo funciona el sistema de niveles VIP permanentes?</h3>
            <p className="text-sm text-muted-foreground">
              Nuestro sistema de niveles VIP está diseñado para recompensar tu lealtad. Una vez que alcanzas un nivel
              VIP determinado, este se convierte en permanente. Esto significa que incluso si realizas retiros que
              reducen tu saldo por debajo del requisito mínimo de ese nivel, seguirás disfrutando de todos los
              beneficios asociados a tu nivel VIP más alto alcanzado.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cómo puedo aumentar mi nivel VIP?</h3>
            <p className="text-sm text-muted-foreground">
              Para aumentar tu nivel VIP, simplemente realiza más depósitos en tu cuenta. Cuando el total de tus
              depósitos aprobados alcance el requisito del siguiente nivel, serás promovido automáticamente.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Los beneficios son acumulativos?</h3>
            <p className="text-sm text-muted-foreground">
              Sí, todos los beneficios de los niveles inferiores se mantienen cuando avanzas a un nivel superior, y se
              añaden nuevos beneficios exclusivos.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cómo funcionan los intereses diarios?</h3>
            <p className="text-sm text-muted-foreground">
              Los intereses diarios se calculan sobre tu saldo disponible y se acreditan automáticamente en tu cuenta
              cada 24 horas. El porcentaje de interés depende de tu nivel VIP, comenzando en 1.70% para el nivel básico
              y aumentando hasta 3.40% para el nivel VIP Black. Este interés representa tu ganancia diaria por mantener
              fondos en la plataforma.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cómo funcionan las comisiones de retiro?</h3>
            <p className="text-sm text-muted-foreground">
              Las comisiones de retiro se calculan como un porcentaje del monto que deseas retirar. La comisión
              disminuye con cada nivel VIP. En el nivel VIP 0-3 pagarás una comisión del 9.6%, mientras que en el nivel
              VIP 10 la comisión se reduce al 4%.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cómo funciona mi límite de retiro?</h3>
            <p className="text-sm text-muted-foreground">
              El límite de retiro se aplica a cada retiro individual según tu nivel VIP actual. Por ejemplo, si estás en
              el nivel VIP 5 (Platino), podrás retirar hasta $767 en cada uno de tus retiros. Este límite es
              independiente de tu saldo actual y se basa únicamente en tu nivel VIP. Puedes realizar hasta el número de
              retiros permitidos por tu nivel VIP (por ejemplo, 2 retiros para el nivel Platino), y cada uno de estos
              retiros puede ser por el monto máximo permitido.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">¿Cuántos retiros puedo hacer al mes?</h3>
            <p className="text-sm text-muted-foreground">
              La cantidad de retiros mensuales permitidos varía según tu nivel VIP: el nivel VIP 0 permite 1 retiro, y
              los demás niveles permiten 2 retiros mensuales. Cada uno de estos retiros puede ser por el monto máximo
              permitido para tu nivel VIP, sin que los retiros anteriores afecten al límite de los siguientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente de icono de verificación
function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Componente para mostrar diferentes iconos de beneficios
function BenefitIcon({ index }: { index: number }) {
  const icons = [
    <Wallet key="wallet" className="h-4 w-4 text-primary" />,
    <Shield key="shield" className="h-4 w-4 text-primary" />,
    <TrendingUp key="trending" className="h-4 w-4 text-primary" />,
    <Gift key="gift" className="h-4 w-4 text-primary" />,
    <Clock key="clock" className="h-4 w-4 text-primary" />,
    <Zap key="zap" className="h-4 w-4 text-primary" />,
  ]

  return icons[index % icons.length]
}
