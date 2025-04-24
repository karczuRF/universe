import { useMiningStatesSync } from '@app/hooks';
import MiningView from './MiningView/MiningView';
import { DashboardContentContainer } from './styles';
import { useTappletsStore } from '@app/store/useTappletsStore';
import { Tapplet } from '@app/components/tapplets/Tapplets';

export default function Dashboard() {
    const activeTapplet = useTappletsStore((s) => s.activeTapplet);
    useMiningStatesSync();

    return (
        <DashboardContentContainer $tapplet={!!activeTapplet}>
            {activeTapplet ? <Tapplet source={activeTapplet.source} /> : <MiningView />}
        </DashboardContentContainer>
    );
}
