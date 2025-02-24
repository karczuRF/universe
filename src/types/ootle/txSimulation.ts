import { TransactionStatus } from '@tari-project/tarijs';

export type SimulationStatus = 'pending' | 'success' | 'failure';

export interface Simulation {
    transactionId: number;
    status: SimulationStatus;
    balanceUpdates: BalanceUpdate[];
    errorMsg: string;
    transaction: TxSimulation;
}

export interface BalanceUpdate {
    currentBalance: number;
    newBalance: number;
    vaultAddress: string;
    tokenSymbol: string;
}

export interface SimulationRequestPayload {
    transactionId: number;
}
export interface SimulationSuccessPayload {
    transactionId: number;
    balanceUpdates: BalanceUpdate[];
    transaction: TxSimulation;
}
export interface SimulationFailurePayload {
    transactionId: number;
    errorMsg: string;
    transaction: TxSimulation;
}

export interface TxSimulation {
    status: TransactionStatus;
    errorMsg: string;
}
