import { writable } from 'svelte/store';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export interface WalletState {
	isConnected: boolean;
	address: string | null;
	balance: string | null;
	isConnecting: boolean;
	error: string | null;
}

const initialState: WalletState = {
	isConnected: false,
	address: null,
	balance: null,
	isConnecting: false,
	error: null
};

export const walletStore = writable<WalletState>(initialState);

const config = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(config);

export const walletActions = {
	async connectPetra() {
		walletStore.update(state => ({ ...state, isConnecting: true, error: null }));

		try {
			if (!window.petra) {
				throw new Error('Petra wallet not found. Please install Petra wallet extension.');
			}

			const response = await window.petra.connect();
			const address = response.address;

			// Get balance
			const balance = await aptos.getAccountAPTAmount({
				accountAddress: address
			});

			walletStore.update(state => ({
				...state,
				isConnected: true,
				address,
				balance: (balance / 100000000).toFixed(4), // Convert from octas to APT
				isConnecting: false,
				error: null
			}));
		} catch (error) {
			walletStore.update(state => ({
				...state,
				isConnecting: false,
				error: error instanceof Error ? error.message : 'Failed to connect wallet'
			}));
		}
	},

	async disconnect() {
		try {
			if (window.petra) {
				await window.petra.disconnect();
			}
		} catch (error) {
			console.error('Error disconnecting wallet:', error);
		}

		walletStore.set(initialState);
	},

	async refreshBalance() {
		const currentState = walletStore;
		let state: WalletState;
		
		const unsubscribe = currentState.subscribe(value => {
			state = value;
		});
		unsubscribe();

		if (!state!.address) return;

		try {
			const balance = await aptos.getAccountAPTAmount({
				accountAddress: state!.address
			});

			walletStore.update(state => ({
				...state,
				balance: (balance / 100000000).toFixed(4)
			}));
		} catch (error) {
			console.error('Error refreshing balance:', error);
		}
	}
};

// Type declaration for Petra wallet
declare global {
	interface Window {
		petra?: {
			connect(): Promise<{ address: string }>;
			disconnect(): Promise<void>;
			isConnected(): Promise<boolean>;
			account(): Promise<{ address: string }>;
		};
	}
}