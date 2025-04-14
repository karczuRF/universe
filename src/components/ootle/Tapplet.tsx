import { useTappletTransactionsStore } from '@app/store/useTappletTransactionsStore';
import { useTappletSignerStore } from '@app/store/useTappletSignerStore';
import { useUIStore } from '@app/store/useUIStore';
import { TappletSigner } from '@app/types/ootle/TappletSigner';
import { useCallback, useEffect, useRef } from 'react';
import { setDialogToShow } from '@app/store';

interface TappletProps {
    source: string;
    provider?: TappletSigner;
}

export const Tapplet: React.FC<TappletProps> = ({ source, provider }) => {
    const tappletRef = useRef<HTMLIFrameElement | null>(null);
    const runTransaction = useTappletSignerStore((s) => s.runTransaction);
    const addTransaction = useTappletTransactionsStore((s) => s.addTransaction);

    function sendWindowSize() {
        if (tappletRef.current) {
            const height = tappletRef.current.offsetHeight;
            const width = tappletRef.current.offsetWidth;
            const tappletWindow = tappletRef.current.contentWindow;

            provider?.setWindowSize(width, height);
            provider?.sendWindowSizeMessage(tappletWindow, source);
        }
    }

    function handleMessage(event: MessageEvent) {
        if (event.data.type === 'request-parent-size') {
            if (tappletRef.current) {
                const height = tappletRef.current.offsetHeight;
                const width = tappletRef.current.offsetWidth;
                const tappletWindow = tappletRef.current.contentWindow;

                provider?.setWindowSize(width, height);
                provider?.sendWindowSizeMessage(tappletWindow, source);
            }
        } else if (event.data.type === 'signer-call') {
            console.info('🤝 [TU Tapplet][handle msg] event data:', event.data);
            if (event.data.methodName === 'submitTransaction') {
                addTransaction(event);
                console.info('🤝 [TU Tapplet][handle msg] TX ADDED');
                setDialogToShow('txSimulation');
                return;
            }
            console.info('🤝 [TU Tapplet][handle msg] RUN TX');
            runTappletTx(event);
        }
    }

    const runTappletTx = useCallback(
        async (event: MessageEvent) => {
            await runTransaction(event);
        },
        [runTransaction]
    );

    // const runTappletTxSimulation = useCallback(
    //     async (event: MessageEvent) => {
    //         console.warn('SIIIIMULATION run TX');
    //         const { balanceUpdates, txSimulation } = await runSimulation(event.data.id);
    //         console.warn('SIIIIMULATION RES TX', txSimulation);
    //         console.warn('SIIIIMULATION RES BALANCES', balanceUpdates);
    //     },
    //     [runSimulation]
    // );

    useEffect(() => {
        window.addEventListener('resize', sendWindowSize);
        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('resize', sendWindowSize);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    return <iframe src={source} width="100%" height="100%" ref={tappletRef} onLoad={sendWindowSize}></iframe>;
};
