import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface FormattedCryptoData {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  change7d: number
  marketCap: string
  volume24h: number
  rank: number
  lastUpdated: string
  // Additional fields for detailed view
  circulatingSupply?: string
  totalSupply?: string
  maxSupply?: string
  allTimeHigh?: {
    price: number
    date: string
  }
  website?: string
  whitepaper?: string
  explorer?: string
  algorithm?: string
  proofType?: string
  launchDate?: string
  description?: string
  historicalData?: Array<{
    name: string
    data: Array<{
      date: string
      value: number
    }>
  }>
}

export interface CoinMarketCapSettings {
  apiKey: string | null
  autoUpdate: boolean
  updateInterval: number // in minutes
  dataSource: string
}

// Get CoinMarketCap settings from localStorage and Supabase
export function getCoinMarketCapSettings(): CoinMarketCapSettings {
  try {
    // Try to get from localStorage first
    const savedSettings = localStorage.getItem("cryptSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      return {
        apiKey: settings.apiKey || null,
        autoUpdate: settings.autoUpdate || false,
        updateInterval: settings.updateInterval || 5,
        dataSource: settings.dataSource || "internal",
      }
    }
  } catch (err) {
    console.error("Error loading settings from localStorage:", err)
  }

  // Return default settings
  return {
    apiKey: null,
    autoUpdate: false,
    updateInterval: 5,
    dataSource: "internal",
  }
}

// Mock cryptocurrency data
const mockCryptoData: FormattedCryptoData[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 67234.56,
    change24h: 2.34,
    change7d: 5.67,
    marketCap: "$1.32T",
    volume24h: 28400000000,
    rank: 1,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "19.5M BTC",
    totalSupply: "21M BTC",
    maxSupply: "21M BTC",
    allTimeHigh: {
      price: 69000,
      date: "2021-11-10",
    },
    website: "https://bitcoin.org",
    whitepaper: "https://bitcoin.org/bitcoin.pdf",
    explorer: "https://blockchain.com",
    algorithm: "SHA-256",
    proofType: "Proof of Work",
    launchDate: "2009-01-03",
    description:
      "Bitcoin es la primera criptomoneda descentralizada del mundo, creada en 2009 por una persona o grupo bajo el seudónimo de Satoshi Nakamoto.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 65000 + Math.random() * 5000,
        })),
      },
    ],
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 3456.78,
    change24h: -1.23,
    change7d: 3.45,
    marketCap: "$415.2B",
    volume24h: 15200000000,
    rank: 2,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "120.2M ETH",
    totalSupply: "120.2M ETH",
    maxSupply: "N/A",
    allTimeHigh: {
      price: 4878,
      date: "2021-11-10",
    },
    website: "https://ethereum.org",
    whitepaper: "https://ethereum.org/en/whitepaper/",
    explorer: "https://etherscan.io",
    algorithm: "Ethash",
    proofType: "Proof of Stake",
    launchDate: "2015-07-30",
    description:
      "Ethereum es una plataforma blockchain descentralizada que permite la creación de contratos inteligentes y aplicaciones descentralizadas (dApps).",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 3200 + Math.random() * 500,
        })),
      },
    ],
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    price: 1.0,
    change24h: 0.01,
    change7d: -0.02,
    marketCap: "$97.2B",
    volume24h: 45600000000,
    rank: 3,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "97.2B USDT",
    totalSupply: "97.2B USDT",
    maxSupply: "N/A",
    website: "https://tether.to",
    explorer: "https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7",
    description:
      "Tether es una stablecoin respaldada por moneda fiduciaria que mantiene un valor de 1:1 con el dólar estadounidense.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.998 + Math.random() * 0.004,
        })),
      },
    ],
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    price: 612.34,
    change24h: 1.87,
    change7d: 4.23,
    marketCap: "$89.4B",
    volume24h: 1890000000,
    rank: 4,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "146M BNB",
    totalSupply: "146M BNB",
    maxSupply: "200M BNB",
    website: "https://www.binance.com",
    explorer: "https://bscscan.com",
    description:
      "BNB es el token nativo de Binance, utilizado para pagar tarifas de transacción en Binance Chain y BNB Smart Chain.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 580 + Math.random() * 60,
        })),
      },
    ],
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 178.92,
    change24h: 3.45,
    change7d: 8.91,
    marketCap: "$78.3B",
    volume24h: 3450000000,
    rank: 5,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "437.6M SOL",
    totalSupply: "580.5M SOL",
    maxSupply: "N/A",
    website: "https://solana.com",
    whitepaper: "https://solana.com/solana-whitepaper.pdf",
    explorer: "https://explorer.solana.com",
    proofType: "Proof of History",
    launchDate: "2020-03-16",
    description:
      "Solana es una blockchain de alto rendimiento diseñada para aplicaciones descentralizadas y criptomonedas.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 160 + Math.random() * 30,
        })),
      },
    ],
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    price: 0.6234,
    change24h: -0.87,
    change7d: 2.34,
    marketCap: "$35.2B",
    volume24h: 1230000000,
    rank: 6,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "56.5B XRP",
    totalSupply: "100B XRP",
    maxSupply: "100B XRP",
    website: "https://ripple.com",
    explorer: "https://xrpscan.com",
    description: "XRP es una criptomoneda digital diseñada para pagos rápidos y de bajo costo en la red de Ripple.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.58 + Math.random() * 0.08,
        })),
      },
    ],
  },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    price: 1.0,
    change24h: 0.0,
    change7d: 0.01,
    marketCap: "$32.8B",
    volume24h: 5670000000,
    rank: 7,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "32.8B USDC",
    totalSupply: "32.8B USDC",
    maxSupply: "N/A",
    website: "https://www.circle.com/en/usdc",
    explorer: "https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    description: "USD Coin es una stablecoin totalmente respaldada por dólares estadounidenses, emitida por Circle.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.999 + Math.random() * 0.002,
        })),
      },
    ],
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    price: 0.6789,
    change24h: 1.23,
    change7d: 3.45,
    marketCap: "$23.8B",
    volume24h: 890000000,
    rank: 8,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "35.1B ADA",
    totalSupply: "45B ADA",
    maxSupply: "45B ADA",
    website: "https://cardano.org",
    whitepaper: "https://cardano.org/ouroboros/",
    explorer: "https://cardanoscan.io",
    proofType: "Proof of Stake",
    launchDate: "2017-09-29",
    description:
      "Cardano es una plataforma blockchain de tercera generación basada en investigación científica revisada por pares.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.62 + Math.random() * 0.1,
        })),
      },
    ],
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.1523,
    change24h: 2.87,
    change7d: 5.23,
    marketCap: "$21.7B",
    volume24h: 1450000000,
    rank: 9,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "142.5B DOGE",
    totalSupply: "142.5B DOGE",
    maxSupply: "N/A",
    website: "https://dogecoin.com",
    explorer: "https://dogechain.info",
    algorithm: "Scrypt",
    proofType: "Proof of Work",
    launchDate: "2013-12-06",
    description:
      "Dogecoin es una criptomoneda creada como una broma, pero que ha ganado una comunidad leal y casos de uso reales.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.14 + Math.random() * 0.03,
        })),
      },
    ],
  },
  {
    id: "tron",
    symbol: "TRX",
    name: "TRON",
    price: 0.1678,
    change24h: 0.98,
    change7d: 2.34,
    marketCap: "$14.5B",
    volume24h: 567000000,
    rank: 10,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "86.4B TRX",
    totalSupply: "86.4B TRX",
    maxSupply: "N/A",
    website: "https://tron.network",
    whitepaper: "https://tron.network/resources?lng=en&name=1",
    explorer: "https://tronscan.org",
    description:
      "TRON es una plataforma blockchain descentralizada que busca construir un ecosistema de entretenimiento de contenido digital gratuito.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 0.155 + Math.random() * 0.025,
        })),
      },
    ],
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    price: 7.89,
    change24h: 1.45,
    change7d: 4.67,
    marketCap: "$11.2B",
    volume24h: 345000000,
    rank: 11,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "1.42B DOT",
    totalSupply: "1.42B DOT",
    maxSupply: "N/A",
    website: "https://polkadot.network",
    whitepaper: "https://polkadot.network/PolkaDotPaper.pdf",
    explorer: "https://polkadot.subscan.io",
    proofType: "Nominated Proof of Stake",
    launchDate: "2020-05-26",
    description:
      "Polkadot es un protocolo de blockchain de múltiples cadenas que permite la transferencia de cualquier tipo de datos o activos.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 7.2 + Math.random() * 1.2,
        })),
      },
    ],
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    price: 15.67,
    change24h: 2.34,
    change7d: 6.78,
    marketCap: "$9.8B",
    volume24h: 456000000,
    rank: 12,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "626M LINK",
    totalSupply: "1B LINK",
    maxSupply: "1B LINK",
    website: "https://chain.link",
    whitepaper: "https://chain.link/whitepaper",
    explorer: "https://etherscan.io/token/0x514910771af9ca656af840dff83e8264ecf986ca",
    description:
      "Chainlink es una red de oráculos descentralizada que permite a los contratos inteligentes acceder de forma segura a fuentes de datos externas.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 14.5 + Math.random() * 2.5,
        })),
      },
    ],
  },
  {
    id: "avalanche",
    symbol: "AVAX",
    name: "Avalanche",
    price: 42.34,
    change24h: 3.21,
    change7d: 7.89,
    marketCap: "$16.5B",
    volume24h: 678000000,
    rank: 13,
    lastUpdated: new Date().toISOString(),
    circulatingSupply: "390M AVAX",
    totalSupply: "445M AVAX",
    maxSupply: "720M AVAX",
    website: "https://www.avax.network",
    whitepaper: "https://www.avalabs.org/whitepapers",
    explorer: "https://snowtrace.io",
    proofType: "Proof of Stake",
    launchDate: "2020-09-21",
    description:
      "Avalanche es una plataforma blockchain de capa 1 que ofrece alta velocidad, bajo costo y escalabilidad para aplicaciones descentralizadas.",
    historicalData: [
      {
        name: "Precio",
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 38 + Math.random() * 8,
        })),
      },
    ],
  },
]

// Get a cryptocurrency by ID
export function getCoinMarketCapById(id: string): FormattedCryptoData | null {
  const crypto = mockCryptoData.find((c) => c.id === id)
  return crypto || null
}

// Fetch cryptocurrency data
export async function fetchCryptocurrencyData(limit = 13): Promise<FormattedCryptoData[]> {
  try {
    // Check if we have API settings configured
    const settings = getCoinMarketCapSettings()

    // For now, return mock data
    // In the future, this will call the actual API if configured
    return mockCryptoData.slice(0, limit)
  } catch (error) {
    console.error("Error fetching cryptocurrency data:", error)
    // Return mock data as fallback
    return mockCryptoData.slice(0, limit)
  }
}
