<script lang="ts">
	import { walletStore, walletActions } from '$lib/stores/wallet';

	const handleConnect = () => {
		walletActions.connectPetra();
	};

	const handleDisconnect = () => {
		walletActions.disconnect();
	};

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};
</script>

{#if $walletStore.isConnected}
	<div class="flex items-center gap-2">
		<div class="flex flex-col items-end text-sm">
			<span class="text-white font-medium">{formatAddress($walletStore.address!)}</span>
			{#if $walletStore.balance}
				<span class="text-slate-300 text-xs">{$walletStore.balance} APT</span>
			{/if}
		</div>
		<button
			onclick={handleDisconnect}
			class="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors"
		>
			Disconnect
		</button>
	</div>
{:else}
	<button
		onclick={handleConnect}
		disabled={$walletStore.isConnecting}
		class="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
	>
		{$walletStore.isConnecting ? 'Connecting...' : 'Connect Wallet'}
	</button>
{/if}

{#if $walletStore.error}
	<div class="absolute top-full mt-2 right-0 rounded-lg bg-red-600 p-2 text-sm text-white shadow-lg max-w-xs">
		{$walletStore.error}
	</div>
{/if}