import { useTranslation } from 'react-i18next';

import { useUIStore } from '@app/store/useUIStore';

import { DialogContent, Dialog } from '@app/components/elements/dialog/Dialog';
import { SquaredButton } from '@app/components/elements/buttons/SquaredButton';
import { Typography } from '@app/components/elements/Typography';
import { memo, useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ButtonsWrapper } from './TxSimulationDialog.styles';
import { useTappletProviderStore } from '@app/store/useTappletProviderStore';

const TxSimulationDialog = memo(function AutoUpdateDialog() {
    const { t } = useTranslation('setup-view', { useSuspense: false });
    const open = useUIStore((s) => s.dialogToShow === 'txSimulation');
    const setDialogToShow = useUIStore((s) => s.setDialogToShow);
    const [estimatedFee, setEstimatedFee] = useState(0);
    const runTransaction = useTappletProviderStore((s) => s.runTransaction);
    const runSimulation = useTappletProviderStore((s) => s.runSimulation);
    const getPendingTransaction = useTappletProviderStore((s) => s.getPendingTransaction);
    const tx = getPendingTransaction();

    const handleClose = useCallback(() => {
        console.info('Tx cancelled');
        console.warn('Cancel TX', tx);
        setDialogToShow(null);
        if (!tx) return;
        tx?.cancel();
    }, [setDialogToShow, tx]);

    const handleSubmit = useCallback(async () => {
        console.info('Submit Tx');
        console.warn('SIIIIMULATION run TX', tx);
        if (!tx) return;
        const { balanceUpdates, txSimulation, estimatedFee } = await tx.runSimulation();
        console.warn('SIIIIMULATION RES TX', txSimulation);
        console.warn('SIIIIMULATION RES BALANCES', balanceUpdates);
        setEstimatedFee(estimatedFee ?? 0);
    }, [tx]);

    return (
        <Dialog open={open} onOpenChange={handleClose} disableClose>
            <DialogContent>
                <Typography variant="h3">{'Tx simulation'}</Typography>
                <Typography variant="p">{estimatedFee}</Typography>
                <ButtonsWrapper>
                    <>
                        <SquaredButton onClick={handleClose} color="warning">
                            {'Cancel'}
                        </SquaredButton>
                        <SquaredButton onClick={handleSubmit} color="green">
                            {'Estimate fee'}
                        </SquaredButton>
                    </>
                </ButtonsWrapper>
            </DialogContent>
        </Dialog>
    );
});

export default TxSimulationDialog;
