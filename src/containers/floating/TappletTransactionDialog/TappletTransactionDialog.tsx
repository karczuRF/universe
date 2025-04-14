import { useTranslation } from 'react-i18next';

import { useUIStore } from '@app/store/useUIStore';

import { DialogContent, Dialog } from '@app/components/elements/dialog/Dialog';
import { SquaredButton } from '@app/components/elements/buttons/SquaredButton';
import { Typography } from '@app/components/elements/Typography';
import { memo, useCallback, useState } from 'react';
import { ButtonsWrapper } from './TappletTransactionDialog.styles';
import { useTappletTransactionsStore } from '@app/store/useTappletTransactionsStore';
import { BalanceUpdate } from '@app/types/ootle/txSimulation';
import { TransactionStatus } from '@tari-project/tarijs-types';
import { setDialogToShow } from '@app/store';

const TappletTransactionDialog = memo(function AutoUpdateDialog() {
    const { t } = useTranslation('setup-view', { useSuspense: false }); //TODO add transaltion
    const open = useUIStore((s) => s.dialogToShow === 'txSimulation');
    const getPendingTransaction = useTappletTransactionsStore((s) => s.getPendingTransaction);
    const tx = getPendingTransaction();
    const [estimatedFee, setEstimatedFee] = useState<number>();
    const [txStatus, setTxStatus] = useState<TransactionStatus>(TransactionStatus.New);
    const [balancesUpdated, setBalancesUpdated] = useState<BalanceUpdate[]>([]); //TODO use to display

    const handleClose = useCallback(() => {
        console.info('Tx cancelled');
        console.warn('Cancel TX', tx);
        if (!tx) return;
        tx.cancel();
        setEstimatedFee(undefined);
        setDialogToShow(null);
    }, [tx]);

    const handleSubmit = useCallback(async () => {
        console.warn('SUBMIT run TX', tx);
        if (!tx) return;
        console.warn('✅✅✅[dryrun][tx dialog] tx', tx);
        if (!estimatedFee) {
            setTxStatus(TransactionStatus.DryRun);
            const { balanceUpdates, estimatedFee } = await tx.runSimulation();
            setEstimatedFee(estimatedFee);
            setBalancesUpdated(balanceUpdates);
            return;
        } else {
            setTxStatus(TransactionStatus.Pending);
            await tx.submit();
            setEstimatedFee(undefined);
            setDialogToShow(null);
        }
    }, [estimatedFee, setDialogToShow, tx]);

    return (
        <Dialog open={open} onOpenChange={handleClose} disableClose>
            <DialogContent>
                <Typography variant="h3">{'Transaction'}</Typography>
                <Typography variant="p">{`Id ${tx?.id} fee: ${estimatedFee ?? 0}`}</Typography>
                <Typography variant="p">{`Status; ${txStatus}`}</Typography>
                <Typography variant="p">{`Balances updated: ${balancesUpdated.length}`}</Typography>
                <ButtonsWrapper>
                    <>
                        <SquaredButton onClick={handleClose} color="warning">
                            {'Cancel'}
                        </SquaredButton>
                        <SquaredButton onClick={handleSubmit} color="green">
                            {estimatedFee ? 'Submit' : 'Estimate fee'}
                        </SquaredButton>
                    </>
                </ButtonsWrapper>
            </DialogContent>
        </Dialog>
    );
});

export default TappletTransactionDialog;
