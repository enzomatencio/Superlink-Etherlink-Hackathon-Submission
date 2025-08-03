import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define Etherlink Mainnet chain with multi-RPC fallback
export const etherlinkMainnet = defineChain({
  id: 42793,
  name: 'Etherlink Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'XTZ',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_RPC_PRIMARY || 'https://node.mainnet.etherlink.com',
        import.meta.env.VITE_RPC_FALLBACK || 'https://relay.mainnet.etherlink.com',
        'https://rpc.ankr.com/etherlink_mainnet',
      ],
    },
    public: {
      http: [
        import.meta.env.VITE_RPC_PRIMARY || 'https://node.mainnet.etherlink.com',
        import.meta.env.VITE_RPC_FALLBACK || 'https://relay.mainnet.etherlink.com',
        'https://rpc.ankr.com/etherlink_mainnet',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherlink Explorer',
      url: 'https://explorer.etherlink.com',
    },
  },
});

export const config = getDefaultConfig({
  appName: 'Superlink',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'a1b2c3d4e5f6',
  chains: [etherlinkMainnet],
  ssr: false,
});

// Contract addresses from environment - LIVE MAINNET DEPLOYMENT
export const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS || '0xe60009Dd8017CC4f300f16655E337B382A7AEAE6';
export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || '0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9';
export const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS || '0x2C03058C8AFC06713be23e58D2febC8337dbfE6A';
export const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || '0x421892ff736134d95d177cd716324df1d240c295';

// RPC endpoints
export const RPC_PRIMARY = import.meta.env.VITE_RPC_PRIMARY || 'https://node.mainnet.etherlink.com';
export const RPC_FALLBACK = import.meta.env.VITE_RPC_FALLBACK || 'https://relay.mainnet.etherlink.com';

// The Graph endpoints
export const GRAPH_ENDPOINT = import.meta.env.VITE_GRAPH_ENDPOINT || 'https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v2.2.0-correct-deployment-block';