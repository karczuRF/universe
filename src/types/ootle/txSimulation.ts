import { TransactionStatus } from '@tari-project/tarijs-types';

export interface BalanceUpdate {
    currentBalance: number;
    newBalance: number;
    vaultAddress: string;
    tokenSymbol: string;
}

export interface TxSimulation {
    status: TransactionStatus;
    errorMsg?: string;
}

export interface TxSimulationResult {
    balanceUpdates: BalanceUpdate[];
    txSimulation: TxSimulation;
    estimatedFee?: number;
}
