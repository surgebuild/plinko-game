import { writable, derived } from 'svelte/store';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { AccountInfo, getAptosWallets, type UserApproval } from '@aptos-labs/wallet-standard';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  wallet: any | null;
  availableWallets: any[];
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  balance: null,
  isConnecting: false,
  error: null,
  wallet: null,
  availableWallets: [],
};

export const walletStore = writable<WalletState>(initialState);

const config = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(config);

// Initialize available wallets using wallet standard
let availableWallets: any[] = [];

if (typeof window !== 'undefined') {
  // Get wallets from the standard
  const walletsRegistry = getAptosWallets();
  const wallets = walletsRegistry.aptosWallets;
  availableWallets = wallets;

  // Update store with available wallets
  walletStore.update((state) => ({
    ...state,
    availableWallets: wallets,
  }));

  console.log(
    'Available wallets:',
    wallets.map((w) => w.name),
  );
}

export const walletActions = {
  async connect(walletName?: string) {
    // Get current available wallets
    const walletsRegistry = getAptosWallets();
    const wallets = walletsRegistry.aptosWallets;

    // Find target wallet (default to Petra)
    const targetWallet = walletName
      ? wallets.find((w) => w.name === walletName)
      : wallets.find((w) => w.name === 'Petra') || wallets[0];

    if (!targetWallet) {
      throw new Error(
        `Wallet ${walletName || 'Petra'} not found. Please install the wallet extension.`,
      );
    }

    walletStore.update((state) => ({
      ...state,
      isConnecting: true,
      error: null,
      wallet: targetWallet,
    }));

    try {
      // Connect using wallet standard
      const response = await targetWallet.features['aptos:connect'].connect();
      const { args } = response as UserApproval<AccountInfo>;
      const address = args.address.toString();

      console.log('Connected to wallet:', targetWallet.name, 'Address:', address);

      // Get balance
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: address,
      });

      walletStore.update((state) => ({
        ...state,
        isConnected: true,
        address,
        balance: (balance / 100000000).toFixed(4), // Convert from octas to APT
        isConnecting: false,
        error: null,
      }));
    } catch (error) {
      console.error('Wallet connection error:', error);
      walletStore.update((state) => ({
        ...state,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        wallet: null,
      }));
    }
  },

  async disconnect() {
    const currentState = walletStore;
    let state: WalletState;

    const unsubscribe = currentState.subscribe((value) => {
      state = value;
    });
    unsubscribe();

    try {
      if (state!.wallet && state!.wallet.features['aptos:disconnect']) {
        await state!.wallet.features['aptos:disconnect'].disconnect();
        console.log('Disconnected from wallet:', state!.wallet.name);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }

    // Reset store but keep available wallets
    const walletsRegistry = getAptosWallets();
    const wallets = walletsRegistry.aptosWallets;
    walletStore.set({ ...initialState, availableWallets: wallets });
  },

  async refreshBalance() {
    let currentState: WalletState;

    const unsubscribe = walletStore.subscribe((state) => {
      currentState = state;
    });
    unsubscribe();

    if (!currentState!.address) return;

    try {
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: currentState!.address,
      });

      walletStore.update((state) => ({
        ...state,
        balance: (balance / 100000000).toFixed(4),
      }));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  },
};

// Derived stores for easy access
export const isWalletConnected = derived(walletStore, ($wallet) => $wallet.isConnected);
export const walletAddress = derived(walletStore, ($wallet) => $wallet.address);
export const walletBalance = derived(walletStore, ($wallet) => $wallet.balance);
